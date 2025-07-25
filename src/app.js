import express from "express";
import cookieParser from 'cookie-parser'
const app = express();
app.use(express.json({limit: "16kb"}))
app.use(express.urlencoded({extended: true, limit: "16kb"}))
app.use(express.static("public"))
app.use(cookieParser())

//router
import userRouter from "./router/user.router.js";
app.use('/v1/user', userRouter)

export { app };