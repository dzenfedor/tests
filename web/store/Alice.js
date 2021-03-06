import { action, observable } from 'mobx';
import axios from 'axios';
import Router from 'next/router';
import stringFromUTF8Array from './../utils/batostr';
import { keyPair as wckp } from '@waves/waves-crypto';


class AliceStore {
    stores = null;
    constructor(stores) {
        this.stores = stores;
        // this.init = this.init.bind(this);
        this.auth = this.auth.bind(this);
        this.authCheck = this.authCheck.bind(this);

        this.publicKey = null;
        this.privateKey = null;
    }

    @observable publicKey = null;

    @action
    init() {
        const { login } = this.stores;
        const keyPair = wckp(login.seed);
        this.publicKey = keyPair.public;
        this.privateKey = keyPair.private;
        
        Router.push('/');
    }

    @action
    auth() {
        const { cdm } = this.stores;
        if (typeof window !== 'undefined') {
            try {
                window.Waves.auth({
                    name: 'Chainify',
                    data: process.env.SECRET,
                }).then(() => {
                    window.Waves.publicState().then(data => {
                        this.publicKey = data.account.publicKey; 
                        const groupHash = sessionStorage.getItem('groupHash');
                        cdm.list = null;
                        cdm.initLevelDB(data.account.publicKey, groupHash);
                        if (groupHash) {
                            Router.push(`/index?groupHash=${groupHash}`, `/gr/${groupHash}`);
                        } else {
                            Router.push('/');
                        }
                    })
                    .catch(e => {
                        console.error(e);
                    });
                })
                .catch(e => {
                    console.error(e);
                });
            } catch(e) {
                if (e.message === 'window.Waves is undefined') {
                    console.log('Keeper needed');
                }
            }
        }
    }


    @action
    authCheck() {
        const { login, groups } = this.stores;
        if (typeof window !== 'undefined') {
            try {
                window.Waves.publicState().then(res => {   
                    if (res.locked === true) {
                        this.publicKey = null;
                    } else {
                        if (this.publicKey !== null && this.publicKey !== res.account.publicKey) {
                            groups.resetGroup();
                            this.publicKey = null;
                        }
                    }
                })
                .catch(e => {
                    this.publicKey = null;
                    console.log(e);
                });
            } catch(e) {                
                if (e.message === 'window.Waves is undefined') {
                    console.log('Keeper needed');
                } else {
                    console.log(e);
                }
            } finally {
                if (this.publicKey === null) {
                    Router.push('/login');
                }
            }
        }
    }
}

export default AliceStore;

