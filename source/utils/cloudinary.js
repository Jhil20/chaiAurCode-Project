import {v2 as cloudinary} from 'cloudinary';
import fs from "fs"

cloudinary.config({ 
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
    api_key: process.env.CLOUDINARY_API_KEY, 
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const uploadOnCloudinary = async (locaFilePath)=>{
    try {
        if(!locaFilePath) return null
    const response = await cloudinary.uploader.upload(locaFilePath,{
        resource_type: "auto"
    })
    // console.log("files uploaded on cloud successfully",response.url)
    fs.unlinkSync(locaFilePath)
    return response
    } catch (error) {
        fs.unlinkSync(locaFilePath)
        return null
    }
}


export {uploadOnCloudinary}