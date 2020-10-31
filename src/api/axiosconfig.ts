import qs from 'qs'
const http = require('http');
const https = require('https');

import {AxiosResponse, AxiosRequestConfig} from 'axios'

const axiosconfig: AxiosRequestConfig = {
    baseURL: '/',
    transformResponse: [function (data: AxiosResponse) {
        return data
    }],
    paramsSerializer: function (params: any) {
        return qs.stringify(params)
    },
    timeout: 30000,
    withCredentials: true,
    responseType: 'json',
    xsrfCookieName: 'XSRF-TOKEN',
    xsrfHeaderName: 'X-XSRF-TOKEN',
    maxRedirects: 5,
    maxContentLength: 2000,
    validateStatus: function (status: number) {
        return status >= 200 && status < 300
    },
    httpAgent: new http.Agent({
        keepAlive: true
    }),
    httpsAgent: new https.Agent({
        keepAlive: true
    })
};

export default axiosconfig;
