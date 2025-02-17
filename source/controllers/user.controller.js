import { asyncHandler } from "../utils/asyncHandler.js"
import { ApiError } from "../utils/ApiError.js"
import { user } from "../models/user.models.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import jwt from "jsonwebtoken"


const generateAccessAndRefreshToken=async(userID)=>{
    try {
        const User = await user.findById(userID)
        console.log(User)
        const accessToken=User.generateAccessToken()
        console.log("acc",accessToken)
        const refreshToken=User.generateRefreshToken()
        console.log("ref",refreshToken)
        User.refreshToken=refreshToken
        await User.save({validateBeforeSave:false})
        return {accessToken,refreshToken}
    } catch (error) {
        throw new ApiError(500,"something went wrong while generating refresh and access token")
    }
}

const registerUser = asyncHandler(async (req, res) => {
    const { fullname, email, password, username } = req.body;
    console.log(email);
    if (fullname === "" || email === "" || password === "" || username === "") {
        throw new ApiError(400, "all fields are required")
    }

    const existedUser = await user.findOne({
        $or: [{ username }, { email }]
    })
    if (existedUser) {
        throw new ApiError(409, "user with email or username already exists")
    }

    const avatarLocalPath = req.files?.avatar[0]?.path
    const coverImageLocalPath=req.files?.coverImage[0]?.path
    // let coverImageLocalPath
    // if ((req.files && Array.isArray(req.files.coverImage)) && (req.files.coverImage.length > 0)) {
    //     coverImageLocalPath = req.files
    // }
    if (!avatarLocalPath) {
        throw new ApiError(400, "avatar field is required ")
    }
    const avatar = await uploadOnCloudinary(avatarLocalPath)
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)
    if (!avatar) {
        throw new ApiError(400, "avatar field is required ")
    }

    const User = await user.create({
        fullname,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        email,
        password,
        username: username
    })
    const createdUser = await user.findById(User._id).select(
        "-password -refreshToken"
    )
    console.log(createdUser);
    if (!createdUser) {
        throw new ApiError(500, "something went wrong while registering the user")
    }

    return res.status(201).json(
        new ApiResponse(200, createdUser, "user registered sucessfully")
    )
})

const loginUser = asyncHandler(async (req, res) => {
    // get username or email, password from frontend
    // check whether the user exits or Not
    // if not then handle the error
    // send access token and refresh token in cookies

    const { username, email, password } = req.body
    if (!username && !email) {
        throw new ApiError(400, "username or email is required")
    }
    
    const User = await user.findOne({
        $or: [{ email }, { username }]
    })
    if (!User) {
        throw new ApiError(404, "User does not exist")
    }

    const isPasswordValid=await User.isPasswordCorrect(password)
    if(!isPasswordValid){
        throw new ApiError(401,"incorrect password")
    }

    const {accessToken,refreshToken} =await generateAccessAndRefreshToken(User._id)
    // console.log("accessToken",accessToken);
   const loggedInUser=await user.updateOne(User._id).select("-password -refreshToken")
   const options={
    httpOnly:true,
    secure:true
   }
   return res
   .status(200)
   .cookie("accessToken",accessToken,options)
   .cookie("refreshtoken",refreshToken,options)
   .json(
    new ApiResponse(
        200,
        {
            user:loggedInUser,accessToken,refreshToken
        },
        "user logged in successfully"
    )
   )
})

const logoutUser=asyncHandler(async(req,res)=>{
    await user.findByIdAndUpdate(
        req.User._id,
        {
            $set:{
                refreshToken:undefined
            }
        },
        {
            new:true
        }
    )

    const options={
        httpOnly:true,
        secure:true
    }
    
    return res
    .status(200)
    .clearCookie("accessToken",options)
    .clearCookie("refreshToken",options)
    .json(new ApiResponse(200,{},"user logged out"))
})

const refreshAccessToken = asyncHandler(async(req,res)=>{
    try {
        const incomingRefreshToken=req.cookies.refreshToken || req.body.refreshToken
        if(!incomingRefreshToken){
            throw new ApiError(401,"unauthorized access")
        }
    
        const decodedToken=jwt.verify(
            incomingRefreshToken,
            process.env.REFRESH_TOKEN_SECRET
        )
        const User=await user.findById(decodedToken?._id)
        if(!User){
            throw new ApiError(401,"Invalid refresh token")
        }
    
        if(!incomingRefreshToken !== User?.refreshToken){
            throw new ApiError(401,"refresh token is expired or used")
        }
    
        const options={
            httpOnly:true,
            secure:true
        }
    
        const {accessToken, newRefreshToken}=await generateAccessAndRefreshToken(User._id)
    
        return res
        .status(200)
        .cookie("accessToken",accessToken,options)
        .cookie("refreshToken",newRefreshToken)
        .json(
            new ApiResponse(
                200,
                {
                    accessToken,
                    refreshToken:newRefreshToken
                },
                "access token refreshed"
            )
        )
    } catch (error) {
        throw new ApiError(401,error?.message || "invalid refresh token")
    }
})

const changeCurrentPassword=asyncHandler(async(req,res)=>{
    const {oldPassword,newPassword}=req.body

    const User=await user.findById(req?._id)
    const isPasswordCorrect=await User.isPasswordCorrect(oldPassword)
    if(!isPasswordCorrect){
        throw new ApiError(400,"invalid old password")
    }
    User.password=newPassword
    await User.save({validateBeforeSave:false})

    return res
    .status(200)
    .json(new ApiResponse(200,{},"password changed successfully"))
})

const updateAccountDetails=asyncHandler(async(req,res)=>{
    const {fullname,email,username}=req.body
    if(!fullname || !email || !username){
        throw new ApiError(400,"all fields are required")
    }
    const User=await user.findByIdAndUpdate(
        req.User?._id,
        {
            $set:{
                fullname:fullname,
                email:email,
                username:username
            }
        },
        {
            new:true
        }
    ).select("-password")

    return res
    .status(200)
    .json(new ApiResponse(200,"Account details updated successfully"))
})

const updateAvatar=asyncHandler(async(req,res)=>{
    const avatarLocalPath= req.file?.path
    if(!avatarLocalPath){
        throw new ApiError(400,"avatar file is missing")
    }
    const avatar=await uploadOnCloudinary(avatarLocalPath)
    if(!avatar.url){
        throw new ApiError(400,"error while uploading on avatar")
    }
    const User=await user.findByIdAndUpdate(
        req.User?._id,
        {
            $set:{
                avatar:avatar.url
            }
        },
        {new:true}
    ).select("-password")

    return res
    .status(200)
    .json(new ApiResponse(200,"avatar image updated successfully"))
})

const updateCoverImage=asyncHandler(async(req,res)=>{
    const coverImageLocalPath= req.file?.path
    if(!coverImageLocalPath){
        throw new ApiError(400,"avatar file is missing")
    }
    const coverImage=await uploadOnCloudinary(coverImageLocalPath)
    if(!coverImage.url){
        throw new ApiError(400,"error while uploading on cover image")
    }
    const User=await user.findByIdAndUpdate(
        req.User?._id,
        {
            $set:{
                coverImage:coverImage.url
            }
        },
        {new:true}
    ).select("-password")

    return res
    .status(200)
    .json(new ApiResponse(200,"cover image updated successfully"))
})

const getUserChannelProfile = asyncHandler(async(req,res)=>{
    const {username}=req.params
    if(!username?.trim()){
        throw new ApiError(400,"username is missing")
    }
    const channel=await user.aggregate([
        {
            $match:{
                username: username
            }
        },
        {
            $lookup:{
                from :"subscriptions",
                localField:"_id",
                foreignField:"channel",
                as:"subscribers"
            }
        },
        {
            $lookup:{
                from:"subscriptions",
                localField:"_id",
                foreignField:"subscriber",
                as:"subcribedTo"
            }
        },
        {
            $addFields:{
                subscribersCount:{
                    $size:"$subscribers"
                },
                channelSubcribedToCount:{
                    $size:"$subcribedTo"
                },
                isSubscribed:{
                    $cond:{
                        if:{$in:[req.User?._id,"$subscribers.subscriber"]},
                        then:true,
                        else:false
                    }
                }
            }
        },
        {
            $project:{
                fullname:1,
                username:1,
                subscribersCount:1,
                channelSubcribedToCount:1,
                isSubscribed:1,
                avatar:1,
                coverImage:1,
                email:1
            }
        }
    ])

    if (!channel?.length) {
        throw new ApiError(404,"channel does not exists")
    }
    return res
    .status(200)
    .json(
        new ApiResponse(200,channel[0],"user channel fetched successfully")
    )
})

export {
    loginUser,
    registerUser,
    logoutUser,
    refreshAccessToken,
    changeCurrentPassword,
    updateAccountDetails,
    updateCoverImage,
    updateAvatar,
    getUserChannelProfile
}