import React, { Component } from 'react'
import { browserHistory } from 'react-router';
// web3.sha3 handles numbers differently than solidity
import abi from 'ethereumjs-abi';
// local
import './style.css';
import { CONTRACT_BYTECODE, CONTRACT_ABI, GAS_LIMIT } from '../../constants.js';

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

/*
* Stateless dropdown compoennt for game options
*/
export const MovesDropdown = (props) => {
  return (
    <select onChange={props.onChange}>
      <option value={null}></option>
      <option value={1}>Rock</option>
      <option value={2}>Paper</option>
      <option value={3}>Scissors</option>
      <option value={4}>Lizard</option>
      <option value={5}>Spock</option>
    </select>
  )
}

class Home extends Component {
  constructor(props) {
    super(props);

    this.state = {
      pendingTxHash: null,
      stakedEther: 0,
      player2address: null,
      player1Guess: null,
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
       gas: GAS_LIMIT,
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
    if (!this.state.player2address || !this.state.stakedEther || !this.state.player1Guess) {
      // TODO error handling
      return;
    }
    // generate a salt for the
    const salt = this.generateSalt();
    // set cookie with salt
    localStorage.setItem("rps", JSON.stringify({
      salt: salt,
      selection: this.state.player1Guess,
    }));
    // hash the guess and the salt
    const selectionHash = '0x' + abi.soliditySHA3(["uint8", "uint256"],[this.state.player1Guess, salt]).toString('hex');
    this.deployRPSGame(selectionHash, this.state.player2address, this.state.stakedEther);
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

  generateSalt()   {
    const byteArray = new Uint32Array(1);
    window.crypto.getRandomValues(byteArray);
    return byteArray[0];
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
            Select an opponent, stake some ETH and submit your selection. Your opponent will select
            their option and stake ether. Then you must reveal your vote. The winner receives the combined bids
          </p>
        </div>
        <div className="start-game">
          <form onSubmit={(e) => this.startGame(e)}>
            <label htmlFor="selection-hash">
              Selection
            </label>
            <div className="selection-hash">
              <MovesDropdown onChange={(e) => {this.setState({player1Guess: e.target.value})}}/>
            </div>
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
