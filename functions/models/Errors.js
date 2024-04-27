

class BaseError extends Error {

    constructor(status, code, message) {
        super()
        this.status = status
        this.code = code
        this.message = message
    }
}

class BadRequestError extends BaseError {

    constructor(message) {
        super(400, "InvalidParameter", message)
    }
}

class NotFoundError extends BaseError {

    constructor(message) {
        super(404, "NotFound", message)
    }
}

class ApplicationError extends BaseError {

    constructor(error) {
        super(
            error?.status ?? 500, 
            error?.code ?? "Unknown", 
            error?.message ?? "Unknown error occurs"
        )
        this.origin = error
    }
}

module.exports = {
    Base: BaseError, 
    BadRequest: BadRequestError, 
    NotFound: NotFoundError, 
    Application: ApplicationError
}