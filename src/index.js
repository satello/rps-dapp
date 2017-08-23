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

function startApp() {
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
}


window.addEventListener('load', function() {
  // Checking if Web3 has been injected by the browser (Mist/MetaMask)
  if (typeof this.web3 !== 'undefined') {
    console.log("we are here");
    // Use Mist/MetaMask's provider
    window.web3 = new Web3(this.web3.currentProvider);
    startApp();
  } else {
    console.log('No web3? You should consider trying MetaMask!')
    // fallback - use your fallback strategy (local node / hosted node + in-dapp id mgmt / fail)
    document.getElementById('root').innerHTML = "<h1>Requires MetaMask</h1>";
  }
})
