declare namespace Ajax {
    export interface AxiosResponse {
        data: AjaxResponse
    }

    export interface AjaxResponse {
        code: number,
        data: any,
        message: string
    }
}
