import { Request, Response, NextFunction } from "express"
import { ZodError, ZodType } from "zod"

type ValidationSchema = {
body?: ZodType
params?: ZodType
query?: ZodType
}

export function validator(schema: ValidationSchema) {
return (req: Request, res: Response, next: NextFunction) => {
try {


  if (schema.body) {
    req.body = schema.body.parse(req.body) as any
  }

  if (schema.params) {
    req.params = schema.params.parse(req.params) as any
  }

  if (schema.query) {
    req.query = schema.query.parse(req.query) as any
  }

  next()

} catch (err) {

  if (err instanceof ZodError) {
    return res.status(400).json({
      success: false,
      errors: err.issues
    })
  }

  next(err)
}


}
}
