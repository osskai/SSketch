import {GetterTree, MutationTree, ActionTree} from 'vuex'

interface LoginState {
    [key: string]: any
}

const state: LoginState = {
    user_id: '1',
    authority: 1,
    token: ''
};


const getters: GetterTree<LoginState, any> = {
    getUserId: (state: LoginState) => state.user_id,
    getToken: (state: LoginState) => state.token
};


const mutations: MutationTree<LoginState> = {
    UPDATE_STATE(state: LoginState, data: LoginState) {
        Object.keys(data).forEach((item) => {
            state[item] = data[item]
        })
    }
};

const actions: ActionTree<LoginState, any> = {
    UPDATE_STATE_ASYN({commit, state: LoginState}, data: LoginState) {
        commit('UPDATE_STATE', data)
    }
};

export default {
    namespaced: true,
    state,
    getters,
    mutations,
    actions
}
