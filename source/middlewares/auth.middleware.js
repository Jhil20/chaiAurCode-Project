import { user } from "../models/user.models.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import jwt from "jsonwebtoken"

export const verifyJWT = asyncHandler(async(req,res,next)=>{
    try {
        const token=req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ", "")
        console.log(token)
        if(!token){
            throw new ApiError(401,"unauthorized access")
        }
        // console.log(token);
        const decodedToken=jwt.verify(token,process.env.ACCESS_TOKEN_SECRET)
        console.log(decodedToken)
        const User = await user.findById(decodedToken?._id).select("-password -refreshToken")
        if(!User){
            throw new ApiError(401,"invalid access token")
        }
        
        req.User=User
        next()
    } catch (error) {
        throw new ApiError(401,error?.message || "invalid access token")
    }
})