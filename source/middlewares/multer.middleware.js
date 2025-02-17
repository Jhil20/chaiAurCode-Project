import multer from "multer";

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, "./public/temp")
    },
    //this is the logic of what is the name of the file at the local
    filename: function (req, file, cb) {
    //   const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
      cb(null, file.originalname/*fieldname + '-' + uniqueSuffix*/)
    }
  })
  
export const upload = multer({ storage: storage })  