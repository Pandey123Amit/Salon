class ApiResponse {
  constructor(success, message, data = null) {
    this.success = success;
    this.message = message;
    if (data !== null) {
      this.data = data;
    }
  }

  static success(message, data = null) {
    return new ApiResponse(true, message, data);
  }

  static created(message, data = null) {
    return new ApiResponse(true, message, data);
  }
}

module.exports = ApiResponse;
