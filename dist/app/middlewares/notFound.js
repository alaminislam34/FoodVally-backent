const notFound = (_req, res, _next) => {
    res.status(404).json({
        success: false,
        message: 'API Not Found!',
        error: '',
    });
};
export default notFound;
