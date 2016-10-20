import 'babel-polyfill';
import React from 'react';
import { render } from 'react-dom';
import { Provider } from 'react-redux';
import store from './store';
import { Router, Route, IndexRedirect, browserHistory } from 'react-router';
import DevTools from './components/DevTools';
import { syncHistoryWithStore } from 'react-router-redux';
import ReactGA from 'react-ga';
import { GA_ID, WEBENGAGE_ID } from './constants';
import { getStorage } from './storage';

import checkLogin, { initializeAuthentication } from './session';

// eslint-disable-next-line no-unused-vars
import styles from '../scss/manager.scss';

const history = syncHistoryWithStore(browserHistory, store);
initializeAuthentication(store.dispatch);

import Layout from './layouts/Layout';
import OAuthCallbackPage from './layouts/OAuth';
import { NotFound } from './components/Error';
import Linodes from './linodes';
import Weblish from './linodes/linode/layouts/Weblish';
import NodeBalancers from './nodebalancers';
import Longview from './longview';
import DNSZones from './dnszones';
import Account from './account';
import Support from './support';
import { hideModal } from '~/actions/modal';

import { actions, thunks, reducer } from '~/api/configs/linodes';
window.actions = actions; window.thunks = thunks; window.reducer = reducer;

ReactGA.initialize(GA_ID); // eslint-disable-line no-undef
function logPageView() {
  ReactGA.set({ page: window.location.pathname });
  ReactGA.pageview(window.location.pathname);
}

const init = () => {
  render(
    <Provider store={store}>
      <div>
        <Router history={history} onUpdate={logPageView}>
          <Route
            onEnter={checkLogin}
            path="/linodes/:linodeId/weblish"
            component={Weblish}
          />
          <Route
            onEnter={checkLogin}
            onChange={() => store.dispatch(hideModal())}
            path="/"
            component={Layout}
          >
            <IndexRedirect to="/linodes" />
            {Linodes}
            {NodeBalancers}
            {Longview}
            {DNSZones}
            {Account}
            {Support}
            <Route path="oauth">
              <Route path="callback" component={OAuthCallbackPage} />
            </Route>
            <Route path="*" component={NotFound} />
          </Route>
        </Router>
        <DevTools />
      </div>
    </Provider>,
    document.getElementById('root')
  );
};
if (window.webengage) { // eslint-disable-line no-undef
  webengage.init(WEBENGAGE_ID); // eslint-disable-line no-undef
  webengage.feedback.options('formData', [ // eslint-disable-line no-undef
    {
      name: 'email',
      value: getStorage('authentication/email'),
    },
  ]);
}
window.init = init;
