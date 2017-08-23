import React, { Component } from 'react';

// local
import './style.css';
import { CONTRACT_BYTECODE, CONTRACT_ABI } from '../../constants.js';

// get web3 instance initialized in public/index.html
const web3 = window.web3;

// RPS contract ABI
let rpsGameContract = web3.eth.contract(CONTRACT_ABI);

// Clean state for new game
const initialState = {
  currentGameAddress: null,
  player1address: null,
  player2address: null,
  stakedEther: 0,
  selectionHash: null,
  player1Guess: null,
  salt: null,
  player2Guess: null,
  pendingTxHash: null,
  contractSubmitted: false,
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

    this.state = initialState;
  }

  componentDidUpdate() {
    // game has ended. stake is 0
    if (!this.state.gameComplete && this.state.readyForReveal && this.state.stakedEther === 0) {
      this.setState({
        gameComplete: true
      });
    }
  }

  resetGame() {
    this.setState(initialState);
  }

  startGame(e) {
    e.preventDefault();

    if (!this.state.player2address || !this.state.stakedEther || !this.state.selectionHash) {
      // TODO display error message to user
      return;
    }

    this.deployRPSGame(this.state.selectionHash, this.state.player2address, this.state.stakedEther);
  }

  getGameState(e) {
    e.preventDefault();
    const gameAddress = document.getElementById('game-address').value;

    this.loadStateFromBlockchain(gameAddress);
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
  * Use with metamask. Deploy RPS game to specified network
  * @params
  * selectionHash <bytes32 string>: hashed RPS commitment. keccak256(SELECTION, salt)
  * opponentAddress <string>: address of opponent
  * stakedEther <int>: number of ether to stake on the game
  */
  deployRPSGame(selectionHash, opponentAddress, stakedEther) {
    const rpsGame = rpsGameContract.new(
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

          this.setState({
            currentGameAddress: rpsGame.address,
            player1address: web3.eth.accounts[0],
            pendingTxHash: null
          });
        } else {
          this.setState({
            contractSubmitted: true,
            pendingTxHash: contract.transactionHash
          });
        }
      }.bind(this)
    );
  }

  /*
  * Update component state to reflect what is on blockchain
  * TODO Very messy way of doing this. Come up with better state system
  */
  loadStateFromBlockchain(gameAddress) {
    // FIXME this is an awful way to update the state. I hope there is a better way I am missing
    const contractInstance = rpsGameContract.at(gameAddress);
    if (contractInstance) {
      contractInstance.j1((error, result) => {
        // console.log(web3.toAscii(result));
        this.setState({
          player1address: result
        });
      });
      contractInstance.j2((error, result) => {
        this.setState({
          player2address: result
        });
      });
      contractInstance.c1Hash((error, result) => {
        this.setState({
          selectionHash: result
        });
      });
      contractInstance.c2((error, result) => {
        this.setState({
          readyForReveal: !!(web3.toDecimal(result)),
        });
      });
      contractInstance.stake((error, result) => {
        this.setState({
          stakedEther: web3.fromWei(web3.toDecimal(result), 'ether')
        });
      });

      this.setState({
        contractSubmitted: true,
        currentGameAddress: gameAddress
      })
    }
  }

  /*
  * Call play() in contract on chain with player2's guess
  * Use same staked Ether as player1
  */
  submitPlayer2Guess() {
    if (!this.state.player2Guess) return;
    console.log(this.state.player2Guess);

    const contractInstance = rpsGameContract.at(this.state.currentGameAddress);
    contractInstance.play(
      this.state.player2Guess,
      {
        from: web3.eth.accounts[0],
        gas: '4300000',
        value: web3.toWei(this.state.stakedEther, 'ether'),
      },function(error, transactionHash) {
        if (!error) {
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
        gas: '4300000',
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

  handleInputChange(event) {
    const target = event.target;
    const name = target.name;

    this.setState({
      [name]: target.value
    });
  }

  render() {
    // waiting for pending tx
    if (this.state.pendingTxHash) {
      return (
        <div className="RPSGame">
          <div className="intro">
            <h1>Transaction Has Been Submitted...</h1>
            <h4>Tx Hash: {this.state.pendingTxHash}</h4>
            <p>Please wait for it to be mined. This may take several minutes. Do not refresh the page</p>
          </div>
        </div>
      );
    }

    // game over
    if (this.state.gameComplete) {
      return (
        <div className="RPSGame">
          <div className="intro">
            <h1>Game Over</h1>
            <h4>Funds have been released</h4>
          </div>
        </div>
      )
    }

    // reveal step
    if (this.state.readyForReveal) {
      const currentUserAddress = web3.eth.accounts[0];
      let options;

      if (this.state.player1address && currentUserAddress === this.state.player1address.toLowerCase()) {
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
      return (
        <div className="RPSGame">
          <div className="intro">
            <h1>Player 1 Reveal</h1>
            <h3>Game Address: {this.state.currentGameAddress}</h3>
            <p>Player 1 address: {this.state.player1address}</p>
            <p>Player 2 address: {this.state.player2address}</p>
            <p>Ether Stake: {this.state.stakedEther}</p>
            <p>Note: Inputs will not be visible unless current user is player 2</p>
          </div>
          {options}
        </div>
      )
    }

    // player 2 selection step
    if (this.state.currentGameAddress) {
      // address of user
      const currentUserAddress = web3.eth.accounts[0];
      let options;

      if (this.state.player2address && currentUserAddress === this.state.player2address.toLowerCase()) {
        options = (
          <div className="player-2-guess">
            <MovesDropdown onChange={(e) => {this.setState({player2Guess: e.target.value})}}/>
            <div className="btn" onClick={this.submitPlayer2Guess.bind(this)}>Submit</div>
          </div>
        )
      }
      return (
        <div className="RPSGame">
          <div className="intro">
            <h1>Player 2 Input Guess</h1>
            <h3>Game Address: {this.state.currentGameAddress}</h3>
            <p>Player 1 address: {this.state.player1address}</p>
            <p>Player 2 address: {this.state.player2address}</p>
            <p>Ether Stake: {this.state.stakedEther}</p>
            <p>Note: Inputs will not be visible unless current user is player 2</p>
          </div>
          {options}
        </div>
      )
    } else {
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
            <form onSubmit={this.getGameState.bind(this)}>
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
}

export default RPSGame;
