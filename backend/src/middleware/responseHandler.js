const sendResponse = (res, statusCode, message, data = null, meta = null) => {
    const response = {
        success: true,
        message
    };

    if (data !== null) {
        response.data = data;
    }

    if (meta !== null) {
        response.meta = meta;
    }

    res.status(statusCode).json(response);
};

const sendSuccess = (res, message = 'Success', data = null, meta = null) => {
    if (typeof message !== 'string') {
        const legacyData = message;
        const legacyMessage = typeof data === 'string' ? data : 'Success';
        const legacyMeta = data && typeof data === 'object' ? data : meta;
        return sendResponse(res, 200, legacyMessage, legacyData, legacyMeta);
    }

    sendResponse(res, 200, message, data, meta);
};

const sendCreated = (res, message = 'Created successfully', data = null) => {
    if (typeof message !== 'string') {
        const legacyData = message;
        const legacyMessage = typeof data === 'string' ? data : 'Created successfully';
        return sendResponse(res, 201, legacyMessage, legacyData);
    }

    sendResponse(res, 201, message, data);
};

const sendNoContent = (res) => {
    res.status(204).send();
};

module.exports = {
    sendResponse,
    sendSuccess,
    sendCreated,
    sendNoContent
};
