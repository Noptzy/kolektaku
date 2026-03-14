class resHandler {
    constructor(success, message, data = null) {
        this.success = success;
        this.message = message;
        this.data = data;
    }

    static success(message = 'Success', data = null) {
        return new resHandler(true, message, data);
    }

    static error(message = 'Error', data = null) {
        return new resHandler(false, message, data);
    }

    toJSON() {
        const response = {
            success: this.success,
            message: this.message,
            creator: 'NopTzy',
        };

        if (
            this.data &&
            typeof this.data === 'object' &&
            typeof this.data.total === 'number' &&
            typeof this.data.page === 'number' &&
            typeof this.data.limit === 'number' &&
            typeof this.data.totalPages === 'number'
        ) {
            // Either data.data is an array (standard response) OR data.relations is an array (staff/va/studio response)
            if (Array.isArray(this.data.data)) {
                response.data = this.data.data;
            } else {
                // For custom relation structures where the generic 'data' property is mapped to specific keys
                // We extract the pure data payload without the pagination keys
                const { total, page, limit, totalPages, ...restData } = this.data;
                // If the only thing inside restData is 'data', unwrap it, otherwise keep the object structure
                response.data = restData.data !== undefined ? restData.data : restData;
            }
            
            response.total = this.data.total;
            response.page = this.data.page;
            response.limit = this.data.limit;
            response.totalPages = this.data.totalPages;
        } else {
            response.data = this.data;
        }

        return response;
    }
}

module.exports = resHandler;
