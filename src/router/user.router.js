import { Router } from "express";
import {
  changeCurrentPassword,
  getCurrentUser,
  getUserChannelProfile,
  getWatchHistory,
  loggedInUser,
  loggedOutUser,
  refreshAccessToken,
  registerUser,
  updateAccountDetails,
  updateUserAvatar,
  updateUserCoverImage,
} from "../controllers/user.controller.js";
import { upload } from "../middleware/multer.middleware.js";
import { jwtToken } from "../middleware/auth.middleware.js";

const router = Router();

router.route("/register").post(
  upload.fields([
    { name: "avatar", maxCount: 1 },
    { name: "coverImage", maxCount: 1 },
  ]),
  registerUser
);

router.route("/login").post(loggedInUser);


// secure route //
router.route("/logout").post(jwtToken, loggedOutUser);
router.route("/refresh-token").post(refreshAccessToken);
router.route("/password-changes").post(jwtToken, changeCurrentPassword);
router.route("/current-user").get(jwtToken, getCurrentUser);
router.route("/update-account").patch(jwtToken, updateAccountDetails)
router.route("/avatar").patch(jwtToken, upload.single("avatar"), updateUserAvatar)
router.route("/cover-image").patch(jwtToken, upload.single("coverImage"), updateUserCoverImage)
router.route("/c/:username").get(jwtToken, getUserChannelProfile)
router.route("/history").get(jwtToken, getWatchHistory)

export default router;
