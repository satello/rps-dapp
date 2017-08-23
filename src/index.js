import React, { Component } from 'react';
import ReactDOM from 'react-dom';
import {Router, browserHistory} from 'react-router';
import Web3 from 'web3';

// routes
import {Route, IndexRoute} from 'react-router';

// views
import Game from './views/game';

// import main style dependency file
import './index.css';

// add header, footer here
class App extends Component {
  render() {
    return (
      <div className="app-wrapper">
          <div className="content-container">
              {this.props.children}
          </div>
      </div>
    )
  }
}

ReactDOM.render(
  <div>
    <Router history={browserHistory}>
      <Route component={App} path='/'>
          <IndexRoute component={Game} />
      </Route>
    </Router>
  </div>,
  document.getElementById('root')
);
