import React from 'react';
import './css/loginform.css';
import 'bootstrap/dist/css/bootstrap.css';
import 'bootstrap/dist/js/bootstrap.js'
import processRequest from "./api";
/* helpers */
import cloneDeep from "lodash.clonedeep"

class LoginForm extends React.Component {

    static _MESSAGES = {
        success: {
            authenticated: 'Authentication succeeded!',
            changedPW: `Password successfully changed. Please log back in with your new credentials!`,
            loggedOut: 'Successfully logged out!'
        },
        failure: {
            authenticated: 'Authentication failed!',
            changedPW: 'Password change failed!',
        }

    };

    constructor(props) {
        super(props);
        // Remember! This binding is necessary to make `this` work in the callback
        this.handleLogin = this.handleLogin.bind(this);
        this.initialState = {
            formToDisplay: '',
            authenticated: this.props.authMeta.authenticated,
            password: '',
            username: '',
            oldPassword: '',
            newPassword: '',
            messages: LoginForm._MESSAGES
        };
        this.state = cloneDeep(this.initialState);
    }

    resetState() {
        this.setState(this.initialState);
    }


    componentWillMount() {
        this.setState({authenticated: this.props.authMeta.authenticated})
    }

    componentDidMount() {
        this.setFormToDisplay();
    }

    componentWillUnmount() {
        this.resetState();
    }

    componentDidUpdate(prevProps, prevState, snapshot) {
        if (prevState.authenticated !== this.state.authenticated) {
            this.setFormToDisplay();
        }
    }

    componentWillReceiveProps(nextProps) {
        this.setState({
            authenticated: nextProps.authMeta.authenticated,
            csrfToken: nextProps.csrfToken
        });
    }

    setFormToDisplay({form = null} = {}) {
        if (form) {
            this.setState({formToDisplay: form});
        } else {
            this.setState({formToDisplay: this.state.authenticated ? 'logout' : 'login'});
        }
    }

    handleLogin() {
        let username = this.state.username;
        let password = this.state.password;
        this.setState({username: '', password: ''});
        this.authenticate({
            apiMode: this.props.apiOptions.POST_AUTH,
            requestData: {
                data: {
                    username: username,
                    password: password
                },
            }
        });
        this.resetState();
    }

    handleLogout() {
        this.props.deleteSessionStorage(['token', 'username']);
        this.props.setMessage({
            message: this.state.messages.success.loggedOut,
            messageClass: 'alert alert-success'
        });
        this.resetState();
        this.props.setAuthentication();
    }

    handleChangePassword() {
        let oldPassword = this.state.oldPassword;
        let newPassword = this.state.newPassword;
        this.setState({oldPassword: '', newPassword: ''});
        this.authenticate({
            apiMode: this.props.apiOptions.PATCH_CHANGE_PW,
            requestData: {
                data: {
                    old_password: oldPassword,
                    new_password: newPassword,
                    username: this.props.getSessionStorage('username')
                },
            }
        });
        this.resetState();
    }


    authenticate = ({apiMode = null, requestData = null} = {}) => {
        // triggers API to get auth token
        const apiRequest = processRequest({
            apiMode: apiMode,
            csrfToken: this.state.csrfToken,
            requestData: requestData.data
        });
        if (apiRequest) {
            apiRequest.then((response) => {
                if (response && response.data.hasOwnProperty('token')) {
                    // logged in
                    this.props.deleteSessionStorage(['token', 'username']); // ensure any existing token deleted 1st
                    this.props.setSessionStorage({key: 'token', value: response.data.token});
                    this.props.setSessionStorage({key: 'username', value: requestData.data.username});
                    this.props.setMessage({  // display message
                        message: this.state.messages.success.authenticated,
                        messageClass: 'alert alert-success'
                    });
                     this.props.setAuthentication();
                }
                if (response.data.hasOwnProperty('password')) {
                    // changed password
                    if (response.data.password === 'CHANGED') {
                        this.props.deleteSessionStorage(['token', 'username']); // delete existing token to enforce re-login
                        this.props.setMessage({
                            message: this.state.messages.success.changedPW,
                            messageClass: 'alert alert-success'
                        });
                        this.props.setAuthentication();
                    } else {
                        this.props.setMessage({
                            message: this.state.messages.failure.changedPW,
                            messageClass: 'alert alert-success'
                        });
                    }
                }
            }).catch(error => {
                let firstError = Object.keys(error.response.data)[0];
                let displayError = error.response.data[firstError][0];
                this.resetState();
                this.props.setMessage({
                    message: `${displayError ? displayError : this.state.messages.failure.authenticated}`,
                    messageClass: 'alert alert-danger'
                });
            });
        }
    };

    receivePassword(e) {
        this.setState({password: e.target.value})
    }

    receiveUsername(e) {
        this.setState({username: e.target.value})
    }

    receiveOldPassword(e) {
        this.setState({oldPassword: e.target.value})
    }

    receiveNewPassword(e) {
        this.setState({newPassword: e.target.value})
    }

    render() {
        let displayForm;
        switch (this.state.formToDisplay) {
            case 'login':
            default:
                displayForm = (
                    <form>
                        <div>
                            <div className="form-field">
                                <input className="form-control" placeholder="Username"
                                       value={this.state.username} onChange={(e) => this.receiveUsername(e)}/>
                            </div>
                            <div className="form-field">
                                <input className="form-control" placeholder="Password"
                                       type="password" value={this.state.password}
                                       onChange={(e) => this.receivePassword(e)}/>
                            </div>
                            <div className="form-field">
                                <button className="btn btn-primary"
                                        onClick={(e) => {
                                            e.preventDefault();
                                            this.handleLogin()
                                        }}>Submit
                                </button>
                            </div>
                        </div>
                    </form>
                );
                break;
            case 'logout':
                displayForm = (
                    <div className="logout-button-field">
                        <span className="welcome">Welcome {this.props.getSessionStorage('username')}!</span>
                        <button className="btn btn-secondary"
                                onClick={() => this.setFormToDisplay({form: 'changePassword'})}>Change Password
                        </button>
                        <button className="btn btn-warning" onClick={() => this.handleLogout()}>Logout
                        </button>
                    </div>
                );
                break;
            case 'changePassword':
                displayForm = (
                    <form>
                        <div>
                            <div className="form-field">
                                <input className="form-control" id={'old_password'} value={this.state.oldPassword}
                                       type={'password'} placeholder="Old Password" onChange={(e) =>
                                    this.receiveOldPassword(e)}/>
                            </div>
                            <div className="form-field">
                                <input className="form-control" id={'new_password'} placeholder="New Password"
                                       type="password" value={this.state.newPassword} onChange={(e) =>
                                    this.receiveNewPassword(e)}/>
                            </div>
                            <div className="form-field">
                                <button className="btn btn-primary"
                                        onClick={(e) => {
                                            e.preventDefault();
                                            this.handleChangePassword()
                                        }}>Submit Change
                                </button>
                            </div>
                        </div>
                    </form>
                );
                break;
        }
        return (
            <React.Fragment>
                    <div className={'login'}>{displayForm}</div>
            </React.Fragment>
        )
    }
}

export default LoginForm;