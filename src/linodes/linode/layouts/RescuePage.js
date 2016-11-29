import React, { Component, PropTypes } from 'react';
import { connect } from 'react-redux';
import { getLinode } from './IndexPage';
import { showModal, hideModal } from '~/actions/modal';
import { linodes } from '~/api';
import { resetPassword } from '~/api/linodes';
import PasswordInput from '~/components/PasswordInput';
import HelpButton from '~/components/HelpButton';
import { setSource } from '~/actions/source';


export class ResetRootPwModal extends Component {
  constructor() {
    super();
    this.state = { loading: false };
  }


  render() {
    const { dispatch, resetRootPassword } = this.props;
    const { loading } = this.state;
    return (
      <div>
        <p>
          Are you sure you want to reset the root password for this Linode?
          This cannot be undone.
        </p>
        <div className="modal-footer">
          <button
            className="btn btn-cancel"
            type="button"
            disabled={loading}
            onClick={() => dispatch(hideModal())}
          >Cancel</button>
          <button
            className="btn btn-danger"
            disabled={loading}
            onClick={async () => {
              this.setState({ loading: true });
              await resetRootPassword();
              this.setState({ loading: false });
              dispatch(hideModal());
            }}
          >Reset Password</button>
        </div>
      </div>);
  }
}

ResetRootPwModal.propTypes = {
  linodeId: PropTypes.number.isRequired,
  resetRootPassword: PropTypes.func.isRequired,
  dispatch: PropTypes.func.isRequired,
};

export class RescuePage extends Component {
  static async preload(store, params) {
    const { linodeId } = params;
    await store.dispatch(linodes.one(linodeId));
    await store.dispatch(linodes.disks.all(linodeId));
  }

  constructor() {
    super();
    this.getLinode = getLinode.bind(this);
    this.renderRescueMode = this.renderRescueMode.bind(this);
    this.resetRootPassword = this.resetRootPassword.bind(this);
    this.renderResetRootPassword = this.renderResetRootPassword.bind(this);
    this.state = {
      password: '',
      disk: null,
      loading: true,
      applying: false,
      result: null,
    };
  }

  async componentDidMount() {
    const { dispatch } = this.props;
    dispatch(setSource(__filename));
    const linode = this.getLinode();
    const disk = Object.values(linode._disks.disks)
                       .filter(d => d.filesystem !== 'swap')[0];
    this.setState({
      loading: false,
      disk: disk ? disk.id : null,
    });
  }

  async resetRootPassword() {
    const { password, disk } = this.state;
    const { dispatch } = this.props;
    const linode = this.getLinode();

    try {
      this.setState({ applying: true, result: null });
      const actions = [resetPassword(linode.id, disk, password)];

      await Promise.all(actions.map(dispatch));

      this.setState({
        applying: false,
        result: <span className="text-success">Success!</span>,
      });
    } catch (response) {
      this.setState({
        applying: false,
        result: <span className="text-danger">An error occured.</span>,
      });
    }
    dispatch(linodes.until(l => l.state === linode.status, linode.id));
  }

  renderRescueMode() {
    return (
      <div className="col-sm-6">
        <section className="card">
          <header>
            <h2>
              Rescue mode
              <HelpButton to="http://example.org" />
            </h2>
          </header>
          <p>TODO</p>
        </section>
      </div>
    );
  }

  renderResetRootPassword() {
    const { disk, loading } = this.state;
    const { dispatch } = this.props;
    const linode = this.getLinode();
    if (!linode) {
      return null;
    }
    const resetRootPwModal = (
      <ResetRootPwModal
        linodeId={linode.id}
        dispatch={dispatch}
        resetRootPassword={this.resetRootPassword}
      />);
    let body = null;
    if (loading) {
      body = null;
    } else if (disk === null) {
      body = (
        <p>This Linode does not have any disks eligible for password reset.</p>
      );
    } else {
      const showDisks = linode && linode._disks.totalPages !== -1 ?
        Object.values(linode._disks.disks)
          .filter(d => d.filesystem !== 'swap').length > 1 : false;
      body = (
        <div className="root-pw">
            {showDisks ?
              <div className="form-group row">
                <div className="col-sm-2">
                  <label htmlFor="reset-root-password-select" className="label-col">Disk:</label>
                </div>
                <div className="input-container col-sm-9">
                  <select
                    name="reset-root-password-select"
                    value={disk}
                    className="form-control"
                    onChange={e => this.setState({ disk: e.target.value })}
                  >
                    {Object.values(linode._disks.disks)
                      .filter(d => d.filesystem !== 'swap')
                      .map(d => <option value={d.id} key={d.id}>{d.label}</option>)}
                  </select>
                </div>
              </div>
            : null}
          <div className="form-group row">
              {showDisks ?
                <div className="col-sm-2">
                  <label htmlFor="password" className="label-col">Password:</label>
                </div>
              : null}
            <div className="col-sm-10">
              <PasswordInput
                passwordType="offline_fast_hashing_1e10_per_second"
                onChange={password => this.setState({ password })}
              />
            </div>
          </div>
            {linode.status === 'offline' ? null :
              <div className="alert alert-info">Your Linode must
                be powered off to reset your root password.
              </div>}
          <button
            className="btn btn-danger"
            disabled={!this.state.password || this.state.applying || linode.status !== 'offline'}
            onClick={() => dispatch(showModal('Reset root password', resetRootPwModal))}
          >Reset Password</button>
          <span style={{ marginLeft: '0.5rem' }}>
            {this.state.result}
          </span>
        </div>
      );
    }
    return (
      <div className="col-sm-6">
        <section className="card">
          <header>
            <h2>
              Reset root password
              <HelpButton to="http://example.org" />
            </h2>
          </header>
          {body}
        </section>
      </div>
    );
  }

  render() {
    return (
      <div className="row">
        {this.renderRescueMode()}
        {this.renderResetRootPassword()}
      </div>
    );
  }
}

RescuePage.propTypes = {
  dispatch: PropTypes.func.isRequired,
  params: PropTypes.shape({
    linodeId: PropTypes.string,
  }),
};

function select(state) {
  return { linodes: state.api.linodes };
}

export default connect(select)(RescuePage);
