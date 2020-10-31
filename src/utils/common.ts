import Cookies from 'js-cookie'
import {cookieExpires} from '@/config'


export const TOKEN_KEY: string = 'token';
export const addToken = (token: string) => {
    Cookies.set(TOKEN_KEY, token, {expires: cookieExpires || 1})
};
export const removeToken = () => {
    Cookies.remove(TOKEN_KEY);
};
export const getToken = () => {
    const token = Cookies.get(TOKEN_KEY);
    if (token) {
        return token
    } else {
        return null
    }
};


export const getParams = (url: string) => {
    const keyValueArr = url.split('?')[1].split('&')
    let paramObj: any = {};
    keyValueArr.forEach(item => {
        const keyValue = item.split('=');
        paramObj[keyValue[0]] = keyValue[1]
    });
    return paramObj
};


export const hasKey = (obj: any, key: string | number) => {
    if (key) {
        return key in obj
    } else {
        const keysArr = Object.keys(obj);
        return keysArr.length
    }
};


export const formatDate = (date: any, fmt: string) => {
    let time = '';
    const o: any = {
        "M+": date.getMonth() + 1, // 月份
        "d+": date.getDate(), // 日
        "H+": date.getHours(), // 小时
        "m+": date.getMinutes(), // 分
        "s+": date.getSeconds(), // 秒
        "q+": Math.floor((date.getMonth() + 3) / 3), // 季度
        "S": date.getMilliseconds() // 毫秒
    };
    if (/(y+)/.test(fmt)) {
        time = fmt.replace(RegExp.$1, (date.getFullYear() + "").substr(4 - RegExp.$1.length))
    }
    for (const k in o) {
        if (new RegExp("(" + k + ")").test(fmt)) {
            time = fmt.replace(RegExp.$1, (RegExp.$1.length === 1) ? (o[k]) : (("00" + o[k]).substr(("" + o[k]).length)))
        }
    }
    return time
};


export const getDate = (fmt: any) => {
    return formatDate(new Date(), fmt);
};
