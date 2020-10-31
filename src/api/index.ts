import axios, {AxiosResponse, AxiosRequestConfig} from 'axios'
import {MAINHOST, QAHOST, commonPrams} from '@/config'
import config from './axiosconfig'
import requestSets from "./namelist";
import {getToken, removeToken} from '@/utils/common'
import router from '@/router'

declare type Methods = 'GET' | 'OPTIONS' | 'HEAD' | 'POST' | 'PUT' | 'DELETE' | 'TRACE' | 'CONNECT'

declare interface IData {
    method?: Methods

    [key: string]: any
}

const baseURL = process.env.NODE_ENV === 'production' ? MAINHOST : QAHOST;

interface IServiceItem {
    url: string,
    cancel: Function
}

const cancelToken = axios.CancelToken;

class HttpRequest {
    public pending: Array<IServiceItem>;

    public constructor() {
        this.pending = [];
    }

    removePending(config: AxiosRequestConfig) {
        for (let inx = 0; inx < this.pending.length; ++inx) {
            let list = this.pending[inx];
            if (list.url === config.url + '&' + config.method) {
                list.cancel();
                this.pending.splice(inx, 1)
            }
        }
    };

    interceptors(instance: any) {
        instance.interceptors.request.use(
            (config: AxiosRequestConfig) => {
                this.removePending(config);
                config.cancelToken = new cancelToken((c) => {
                    this.pending.push({url: config.url + '&request_type=' + config.method, cancel: c})
                });

                return config
            },
            (error: any) => {
                return Promise.reject(error)
            }
        );
        instance.interceptors.response.use(
            (response: AxiosResponse) => {
                this.removePending(response.config);
                let {data, status} = response;
                if (status === 200 && data && data.code === 200) {
                    return data.result
                } else {
                    response.data = data;
                    return requestFail(response)
                }
            },
            (error: any) => {
                // empty the pending list
                this.pending = [];
                return Promise.reject(error)
            }
        )
    }

    async request(options: AxiosRequestConfig) {
        const instance = axios.create(config);
        await this.interceptors(instance);
        return instance(options)
    }
}


const requestFail = (res: AxiosResponse) => {
    let errStr = 'request error!';
    if (res.data.code) {
        switch (res.data.code) {
            case 401:
                router.replace({
                    path: '/login',
                    query: {
                        redirect: router.currentRoute.fullPath
                    }
                });
                removeToken();
                break;
            case 403:
                localStorage.removeItem('token');
                setTimeout(() => {
                    router.replace({
                        path: '/login',
                        query: {
                            redirect: router.currentRoute.fullPath
                        }
                    });
                }, 1000);
                removeToken();
                break;
            case 404:
                break;
            default:
                break;
        }
    }
    console.error({
        code: res.data.errcode || res.data.code,
        msg: res.data.errMsg || errStr
    });

    if (typeof res.data.errMsg === 'object') {
        res.data.errMsg = 'server error'
    }

    return null
};

const combineOptions = (_opts: any, data: IData, method: Methods): AxiosRequestConfig => {
    let opts = _opts;
    if (typeof opts === 'string') {
        opts = {url: opts}
    }
    const _data = {...commonPrams, ...opts.data, ...data};
    const options = {
        method: opts.method || data.method || method || 'GET',
        url: opts.url,
        headers: {Authorization: `webcad${getToken()}`},
        baseURL,
        timeout: 10000
    };
    return options.method !== 'GET' ? Object.assign(options, {data: _data}) : Object.assign(options, {params: _data})
};

const HTTP = new HttpRequest();

const Api = (() => {
    const apiObj: any = {};
    const requestList: any = requestSets;
    const fun = (opts: AxiosRequestConfig | string) => {
        return async (data = {}, method: Methods = 'POST') => {
            const newOpts = combineOptions(opts, data, method);
            const res = await HTTP.request(newOpts);
            return res
        }
    };
    Object.keys(requestList).forEach((key) => {
        apiObj[key] = fun(requestList[key])
    });

    return apiObj
})();

export default Api as any
