import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiErrors.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiRespons } from "../utils/ApiRespons.js";
import jwt from "jsonwebtoken";

// AccessToken and RefreshToken //

const generateAccesssAndRefreshToken = async (userId) => {
  try {
    // check userId hoo //
    if (!userId) {
      throw new ApiError(401, "userId not exist");
    }

    // find user //
    const user = await User.findById(userId);
    if (!user) {
      throw new ApiError(404, "user not found");
    }

    // generate access and refresh token //
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    // validation access and refresh token
    if (!(accessToken || refreshToken)) {
      throw new ApiError(500, "access and refresh token does not exist");
    }

    //set refreshToken in user
    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    // return access and refresh token
    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(404, "something went wrong");
  }
};

// REGISTER //

const registerUser = asyncHandler(async (req, res) => {
  // get data for user
  const { fullname, email, username, password } = req.body;

  //validation
  if (
    [username, email, password, fullname].some((fileds) => fileds.trim() === "")
  ) {
    throw new ApiError(400, "all fields are required");
  }

  // existed user
  const existedUser = await User.findOne({
    $or: [{ username }, { email }],
  });

  //check exist user
  if (existedUser) {
    throw new ApiError(409, "username already exist");
  }

  //avater uploded
  let avatarLocalPath = req.files?.avatar[0]?.path;

  if (!avatarLocalPath) {
    throw new ApiError(400, "avater is not uploded");
  }

  //coverImage uploded
  let coverImageLocalPath;
  if (
    req.files &&
    Array.isArray(req.files.coverImage) &&
    req.files.coverImage.length > 0
  ) {
    coverImageLocalPath = req.files.coverImage[0].path;
  }

  //uplode in cloudinary
  const avatar = await uploadOnCloudinary(avatarLocalPath);
  const coverImage = await uploadOnCloudinary(coverImageLocalPath);

  if (!avatar) {
    throw new ApiError(400, "Avater is required");
  }

  //create user in DB
  const user = await User.create({
    email,
    username: username.toLowerCase(),
    password,
    fullname,
    avatar: avatar.url,
    coverImage: coverImage.url || "",
  });

  //find user
  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  //check user
  if (!createdUser) {
    throw new ApiError(500, "DB server error");
  }

  // return user
  return res
    .status(201)
    .json(new ApiRespons(200, createdUser, "user registered successfully"));
});

// LOGIN //

const loggedInUser = asyncHandler(async (req, res) => {
  //get data from req.body
  //validate data hoo
  //username or email validate
  //passwork check
  //add accessToken and refreshToken
  //cookies to add accessToken and refreshToken
  //return user

  // get data from req.body
  const { username, email, password } = req.body;

  // validate data hoo
  if (!username && !email) {
    throw new ApiError(400, "username or email required");
  }

  console.log("email", email);
  console.log("pass", password);
  //username or email validate
  const user = await User.findOne({
    $or: [{ email }, { username }],
  });

  if (!user) {
    throw new ApiError(404, "user does not exist");
  }

  const isPasswordValid = await user.isPasswordCorrect(password);
  if (!isPasswordValid) {
    throw new ApiError(401, "Invalid password");
  }

  const { accessToken, refreshToken } = await generateAccesssAndRefreshToken(
    user._id
  );

  const loggedInUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  const options = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
  };

  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiRespons(
        200,
        { user: loggedInUser, accessToken, refreshToken },
        "user login successfully"
      )
    );
});

// LOGOUT //

const loggedOutUser = asyncHandler(async (req, res, next) => {
  //find user
  //refresh token udefiend
  //new value add
  //return status, clear cookie and respons send empty Object

  await User.findByIdAndUpdate(
    req.user._id,
    { $set: { refreshToken: undefined } },
    { new: true }
  );

  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(201)
    .clearCookie("refreshToken", options)
    .clearCookie("accessToken", options)
    .json(new ApiRespons(200, {}, "user logout successfully"));
});

// Refresh Access Token //

const refreshAccessToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken = req.body?.refreshToken || req.cookies?.refreshToken;

  if (!incomingRefreshToken) {
    throw new ApiError(401, "unauthorized request");
  }


  try {
    const decodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );

    const user = await User.findById(decodedToken?._id);

    if (!user) {
      throw new ApiError(401, "Invalid refresh token");
    }

    if (incomingRefreshToken !== user?.refreshToken) {
      throw new ApiError(401, "Refresh token is expired or used");
    }

    const options = {
      httpOnly: true,
      secure: true,
    };

    const { accessToken, newRefreshToken } =
      await generateAccesssAndRefreshToken(user._id);

    return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", newRefreshToken, options)
      .json(
        new ApiRespons(
          200,
          { accessToken, refreshToken: newRefreshToken },
          "Access token refreshed"
        )
      );
  } catch (error) {
    throw new ApiError(400, error?.message || "Invalid refresh access token");
  }
});

// Change Current Password //

const changeCurrentPassword = asyncHandler(async (req, res) => {
  // get req.body for ond and new password
  // find user for req.user.?_id and validation
  // find old password for change and validation
  // set newPassword from my password field (user.password)
  // password save

  const { oldPassword, newPassword } = req.body;

  if (!oldPassword || !newPassword) {
    throw new ApiError(400, "old and new password is required");
  }

  const user = await User.findById(req.user?._id);

  if (!user) {
    throw new ApiError(401, "user does not exist");
  }
  const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);

  if (!isPasswordCorrect) {
    throw new ApiError(401, "Invalid oldPassword password");
  }

  user.password = newPassword;
  user.save({ validateBeforeSave: false });

  return res
    .status(200)
    .json(new ApiRespons(200, {}, "password change successfully"));
});

// Get Current User //

const getCurrentUser = asyncHandler(async (req, res) => {
  return res
    .status(200)
    .json(new ApiRespons(200, req.user, "current user is valid"));
});

//  Update Account Details //

const updateAccountDetails = asyncHandler(async (req, res) => {
  // get updated value from req.body
  // validation
  // find updated user from req.user
  // updated value, add in DB operator, and add new : true
  //return user

  const { username, email } = req.body;

  if (!(username || email)) {
    throw new ApiError(400, "username and email required");
  }

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    { $set: { username, email } },
    { new: true }
  ).select("-password");

  return res
    .status(200)
    .json(new ApiRespons(200, user, "update account details successfully"));
});

// Update User Avatar //

const updateUserAvatar = asyncHandler(async (req, res) => {
  // get avatarLocalPath from req.file
  // validation
  // avatar upload in cloudinary
  // validation
  // find updated user from req.user
  // updated value avatar, add in DB operator, and add new : true
  //return user

  const avatarLocalPath = req.file?.path;

  if (!avatarLocalPath) {
    throw new ApiError(400, "avatarLocalPath is not valid");
  }

  const avatar = await uploadOnCloudinary(avatarLocalPath);

  if (!avatar) {
    throw new ApiError(400, "avatar does not uploded in cloudinary");
  }

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    { $set: { avatar: avatar.url } },
    { new: true }
  ).select("-password");

  // delete uploaded avatar //

  return res
    .status(200)
    .json(new ApiRespons(200, user, "avatar update successfully"));
});

// Update User Cover Image //

const updateUserCoverImage = asyncHandler(async (req, res) => {
  // get updated value coverImage req.file
  // validation
  // delete old coverImage **
  // coverImage upload in cloudinary
  // validation
  // find updated user of req.user
  // add updated value of DB operator and add new : true
  // return user

  const coverImageLocalPath = req.file?.path;

  if (!coverImageLocalPath) {
    throw new ApiError(400, "Invalid coverImageLocalPath");
  }

  // delete old coverImage assinment

  const coverImage = await uploadOnCloudinary(coverImageLocalPath);

  if (!coverImage) {
    throw new ApiError(401, "coverImage uploaded failds");
  }

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    { $set: { coverImage: coverImage.url } },
    { new: true }
  ).select("-password");

  return res
    .status(201)
    .json(new ApiRespons(200, user, "cover image updated successfully"));
});

export {
  registerUser,
  loggedInUser,
  loggedOutUser,
  refreshAccessToken,
  changeCurrentPassword,
  getCurrentUser,
  updateAccountDetails,
  updateUserAvatar,
  updateUserCoverImage,
};
