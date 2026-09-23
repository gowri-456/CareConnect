// Wraps an async controller function so we don't need try/catch in every controller.
// If the async function throws, this passes the error to Express's error handler.
function catchAsync(fn) {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
}

module.exports = catchAsync;
