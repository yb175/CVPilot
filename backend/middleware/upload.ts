import multer from 'multer';
import { Request } from 'express';

const storage = multer.memoryStorage();

const allowedMimeTypes=[
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]

const fileFilter: multer.Options["fileFilter"]=(req: Request, file,cb)=>{
    if(!allowedMimeTypes.includes(file.mimetype)){
        return cb(new Error("Only PDF and DOCX files are allowed!!"))
    }
    cb(null,true);
}

export const upload= multer({
    storage,
    limits:{
        fileSize: 5 * 1024 * 1024,
    },
    fileFilter,
})

export const uploadResume=upload.single("file");