/**
 * Global Error Handling Middleware
 * 
 * Centralizing error handling here ensures that whenever a route or service throws an error,
 * the frontend receives a robust, consistent JSON format instead of a raw HTML crash page.
 */
const errorHandler = (err, req, res, next) => {
  // Log the comprehensive error stack to the server console for debugging
  console.error(`[Error Triggered] ->`, err.stack);
  
  // Use the status code already set on the response object, or default to 500 (Internal Server Error)
  const statusCode = res.statusCode && res.statusCode !== 200 ? res.statusCode : 500;
  
  // Format the standard response structure
  res.status(statusCode).json({
    success: false,
    message: err.message || 'An unexpected error occurred.',
    // NEVER leak stack traces to the end user in a production setting
    stack: process.env.NODE_ENV === 'production' ? null : err.stack,
  });
};

module.exports = errorHandler;
