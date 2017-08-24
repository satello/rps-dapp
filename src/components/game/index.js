import React, { Component } from 'react';

// local
import { PendingTxHashMessage } from '../home';
import './style.css';
import { CONTRACT_ABI, GAS_LIMIT } from '../../constants.js';

// get web3 instance initialized in public/index.html
const web3 = window.web3;

// RPS contract ABI
let rpsGameContract = web3.eth.contract(CONTRACT_ABI);

// Clean state for new game
const initialState = {
  currentGameAddress: null,
  player1Address: null,
  player2Address: null,
  stakedEther: null,
  selectionHash: null,
  player1Guess: null,
  salt: null,
  player2Guess: null,
  pendingTxHash: null,
  readyForReveal: false,
  gameComplete: false,
}

/*
* Stateless dropdown compoennt for game options
*/
const MovesDropdown = (props) => {
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


class RPSGame extends Component {

  constructor(props) {
    super(props);
    // set up game with game address in uri
    this.state = Object.assign(initialState, {
      currentGameAddress: this.props.params.gameAddress
    });
  }

  componentDidMount() {
    // load state of game from blockchain
    this.loadStateFromBlockchain(this.state.currentGameAddress);
  }

  player1Reveal(e) {
    e.preventDefault();
    // TODO error handling
    if (!this.state.player1Guess || !this.state.salt) return;

    this.submitSolution();
  }

  /*
  * Listen to blockchain for tx to be mined. Once Tx is mined refresh game state from blockchain
  * TODO have some mechanism to stop watching if tx not picked up in n blocks
  */
  listenForHash(txHash) {
    // FIXME not a huge fan of this hack
    const _this = this;
    // Wait for tx to be mined
    var filter = web3.eth.filter('latest').watch((err, blockHash) => {
      // Get info about latest Ethereum block
      web3.eth.getBlock(blockHash, (err, block) => {
        // Found tx hash?
        if (block.transactions.indexOf(txHash) > -1) {
          // Tx is finished
          filter.stopWatching();
          filter = null;
          // we aren't waiting on a tx anymore
          _this.setState({
            pendingTxHash: null
          });
          // sync game state with blockchain
          _this.loadStateFromBlockchain(_this.state.currentGameAddress);
        }
      });
    });
  }

  /*
  * Update component state to reflect what is on blockchain
  * TODO Very messy way of doing this. Come up with better state system
  */
  loadStateFromBlockchain(gameAddress) {
    // FIXME web3 forces callbacks. Change this to Promise's or async
    const contractInstance = rpsGameContract.at(gameAddress);
    if (contractInstance) {
      contractInstance.j1((error, result) => {
        // console.log(web3.toAscii(result));
        this.setState({
          player1Address: result
        });
      });
      contractInstance.j2((error, result) => {
        this.setState({
          player2Address: result
        });
      });
      contractInstance.c1Hash((error, result) => {
        this.setState({
          selectionHash: result
        });
      });
      // order matters with these two
      contractInstance.c2((error, result) => {
        const readyForReveal = !!(web3.toDecimal(result))
        contractInstance.stake((error, result) => {
          const stakedEther = web3.fromWei(web3.toDecimal(result), 'ether');
          // game is over if there is no more ether staked
          if (stakedEther == 0) {
            this.setState({
              gameComplete: true
            });
          } else {
            this.setState({
              stakedEther: stakedEther,
              readyForReveal: readyForReveal
            });
          }

        });
      });
    }
  }

  /*
  * Call play() in contract on chain with player2's guess
  * Use same staked Ether as player1
  */
  submitPlayer2Guess() {
    if (!this.state.player2Guess) return;
    const contractInstance = rpsGameContract.at(this.state.currentGameAddress);
    contractInstance.play(
      this.state.player2Guess,
      {
        from: web3.eth.accounts[0],
        gas: GAS_LIMIT,
        value: web3.toWei(this.state.stakedEther, 'ether'),
      },function(error, transactionHash) {
        if (error) {
          console.log(error);
        } else {
          console.log("player2 guess tx hash: " + transactionHash);
          this.setState({
            pendingTxHash: transactionHash
          });
          this.listenForHash(transactionHash);
        }
      }.bind(this)
    )
  }

  /*
  * Call solve() in on chain contract
  */
  submitSolution() {
    const contractInstance = rpsGameContract.at(this.state.currentGameAddress);
    contractInstance.solve(
      this.state.player1Guess,
      this.state.salt,
      {
        from: web3.eth.accounts[0],
        gas: GAS_LIMIT,
      },function(error, transactionHash) {
        if (!error) {
          this.listenForHash(transactionHash);
          this.setState({
            pendingTxHash: transactionHash
          });
        }
      }.bind(this)
    )
  }

  /*
  * Call solve() in on chain contract
  */
  callTimeout() {
    const contractInstance = rpsGameContract.at(this.state.currentGameAddress);
    const playerAddress = web3.eth.accounts[0];
    if (playerAddress === this.state.player1Address) {
      contractInstance.j2Timeout({
        from: playerAddress,
        gas: GAS_LIMIT,
      },function(error, transactionHash) {
        if (!error) {
          this.listenForHash(transactionHash);
          this.setState({
            pendingTxHash: transactionHash
          });
        }
      }.bind(this))
    } else if (playerAddress === this.state.player2Address) {
      contractInstance.j1Timeout({
        from: playerAddress,
        gas: GAS_LIMIT,
      },function(error, transactionHash) {
        if (!error) {
          this.listenForHash(transactionHash);
          this.setState({
            pendingTxHash: transactionHash
          });
        }
      }.bind(this))
    }
  }

  handleInputChange(event) {
    const target = event.target;
    const name = target.name;

    this.setState({
      [name]: target.value
    });
  }

  render() {
    let body;
    // waiting for pending tx
    if (this.state.pendingTxHash) {
      body = (
        <PendingTxHashMessage pendingTxHash={this.state.pendingTxHash} />
      )
    }
    // game over
    else if (this.state.gameComplete) {
      body = (
          <div className="intro">
            <h1>Game Over</h1>
            <h4>Funds have been released</h4>
          </div>
      )
    }
    // reveal step
    else if (this.state.readyForReveal) {
      const currentUserAddress = web3.eth.accounts[0];
      let options;

      if (this.state.player1Address && currentUserAddress === this.state.player1Address.toLowerCase()) {
        options = (
          <div className="player-1-reveal">
            <form onSubmit={this.player1Reveal.bind(this)}>
              <MovesDropdown onChange={(e) => {this.setState({player1Guess: e.target.value})}}/>
              <label htmlFor="salt">Salt</label>
              <input type="number" id="salt" name="salt" onChange={this.handleInputChange.bind(this)}/>
              <button>Submit</button>
            </form>
          </div>
        )
      }
      body = (
        <div>
          <div className="intro">
            <h1>Player 1 Reveal</h1>
            <h3>Game Address: {this.state.currentGameAddress}</h3>
            <p>Player 1 address: {this.state.player1Address}</p>
            <p>Player 2 address: {this.state.player2Address}</p>
            <p>Ether Stake: {this.state.stakedEther}</p>
            <p>Note: Inputs will not be visible unless current user is player 2</p>
          </div>
          {options}
        </div>
      )
    }
    // player 2 selection step
    else if (this.state.currentGameAddress) {
      // address of user
      const currentUserAddress = web3.eth.accounts[0];
      let options;

      if (this.state.player2Address && currentUserAddress === this.state.player2Address.toLowerCase()) {
        options = (
          <div className="player-2-guess">
            <MovesDropdown onChange={(e) => {this.setState({player2Guess: e.target.value})}}/>
            <div className="btn" onClick={this.submitPlayer2Guess.bind(this)}>Submit</div>
          </div>
        )
      }
      body = (
        <div>
          <div className="intro">
            <h1>Player 2 Input Guess</h1>
            <h3>Game Address: {this.state.currentGameAddress}</h3>
            <p>Player 1 address: {this.state.player1Address}</p>
            <p>Player 2 address: {this.state.player2Address}</p>
            <p>Ether Stake: {this.state.stakedEther}</p>
            <p>Note: Inputs will not be visible unless current user is player 2</p>
          </div>
          {options}
        </div>
      )
    }

    return (
      <div className="RPSGame">
        <div className="btn timeout-btn" onClick={this.callTimeout.bind(this)}>Call Timeout</div>
        {body}
      </div>
    )
  }
}

export default RPSGame;
