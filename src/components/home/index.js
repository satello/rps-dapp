import React, { Component } from 'react'
import { browserHistory } from 'react-router';

// local
import './style.css';
import { CONTRACT_BYTECODE, CONTRACT_ABI } from '../../constants.js';

// get web3 instance initialized in public/index.html
const web3 = window.web3;

// RPS contract ABI
let rpsGameContract = web3.eth.contract(CONTRACT_ABI);

// Pending tx message
export const PendingTxHashMessage = (props) => {
  return (
    <div className="RPSGame">
      <div className="intro">
        <h1>Transaction Has Been Submitted...</h1>
        <h4>Tx Hash: {props.pendingTxHash}</h4>
        <p>Please wait for it to be mined. This may take several minutes. Do not refresh the page</p>
      </div>
    </div>
  );
}


class Home extends Component {
  constructor(props) {
    super(props);

    this.state = {
      pendingTxHash: null,
      stakedEther: 0,
      selectionHash: null,
      player2address: null,
    }
  }

  /*
  * Use with metamask. Deploy RPS game to specified network
  * @params
  * selectionHash <bytes32 string>: hashed RPS commitment. keccak256(SELECTION, salt)
  * opponentAddress <string>: address of opponent
  * stakedEther <int>: number of ether to stake on the game
  */
  deployRPSGame(selectionHash, opponentAddress, stakedEther) {
    rpsGameContract.new(
      web3.toBigNumber(selectionHash),
      web3.toBigNumber(opponentAddress.toLowerCase()),
      {
       from: web3.eth.accounts[0],
       data: CONTRACT_BYTECODE,
       gas: '4300000',
       value: web3.toWei(stakedEther, 'ether'),
      },
      function (e, contract){
        if (e) {
          // TODO error handling
          console.log(e);
        }
        if (contract && typeof contract.address !== 'undefined') {
          console.log('Contract mined! address: ' + contract.address + ' transactionHash: ' + contract.transactionHash);
          // navigate to game page
          browserHistory.push('/' + contract.address);
        } else {
          this.setState({
            pendingTxHash: contract.transactionHash
          });
        }
      }.bind(this)
    );
  }

  startGame(e) {
    e.preventDefault();
    if (!this.state.player2address || !this.state.stakedEther || !this.state.selectionHash) {
      // TODO error handling
      return;
    }
    this.deployRPSGame(this.state.selectionHash, this.state.player2address, this.state.stakedEther);
  }

  goToGame(e) {
    e.preventDefault();
    const gameAddress = document.getElementById('game-address').value;
    browserHistory.push('/' + gameAddress);
  }

  handleInputChange(event) {
    const target = event.target;
    const name = target.name;
    this.setState({
      [name]: target.value
    });
  }

  render() {
    if (this.state.pendingTxHash) {
      return (
        <PendingTxHashMessage pendingTxHash={this.state.pendingTxHash}/>
      )
    }

    return (
      <div className="RPSGame">
        <div className="intro">
          <h1>Start A New Game</h1>
          <p>This is a DApp for Rock, Paper, Scissors, Spock, Lizard. See the rules
            <a href="https://en.wikipedia.org/wiki/Rock%E2%80%93paper%E2%80%93scissors#Additional_weapons"> here</a>.
            Select an opponent, stake some ETH and submit a hash of your selection. Your opponent will select
            their option and stake ether. Then you must reveal your vote. The winner receives the combined bids
          </p>
        </div>
        <div className="start-game">
          <form onSubmit={(e) => this.startGame(e)}>
            <label htmlFor="selection-hash">
              Selection Hash: keccak256 hash your selection (one of: [Rock: 1, Paper: 2, Scissors: 3, Spock: 4, Lizard: 5]),
              and a salt you select. Make sure you don't forget your salt! (e.g. to select Rock hash keccak256(1, salt))
            </label>
            <input
              id="selection-hash"
              name="selectionHash"
              type="text"
              placeholder="e.g. 0x9b68e489a07c86105b2c34adda59d3851d6f33abd41be6e9559cf783147db5dd"
              onChange={this.handleInputChange.bind(this)}
            />
            <label htmlFor="opponent-address">Address of Opponent</label>
            <input
              id="opponent-address"
              type="text"
              name="player2address"
              placeholder="e.g. 0x3e7C893a4e6FBf2C25c13abcdb0E7390DA39aEbD"
              onChange={this.handleInputChange.bind(this)}
            />
            <label htmlFor="staked-ether">Ether to bid</label>
            <input
              id="staked-ether"
              name="stakedEther"
              type="text"
              placeholder="e.g 1.5"
              onChange={this.handleInputChange.bind(this)}
            />
            <button>Start Game</button>
          </form>
          <h4>Have a game address for an existing game?</h4>
          <form onSubmit={this.goToGame.bind(this)}>
            <label htmlFor="staked-ether">Game Address</label>
            <input
              id="game-address"
              type="text"
              placeholder="0x15577aaa4ad12fa0857f22c5c377ea20907e96fd"
            />
            <button>Open Game</button>
          </form>
        </div>
      </div>
    )
  }
}

export default Home;
