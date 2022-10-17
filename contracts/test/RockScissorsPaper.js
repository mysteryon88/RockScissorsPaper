const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("RockScissorsPaper", function () {
  let gameMaster, secondPlayer, randomPlayer
  let choice1 = 1, choice2 = 2
  let sum = 1000
  let secret = ethers.utils.formatBytes32String('secret')
  let rsp 

  async function game(i, j) {
    choice1 = i
    choice2 = j
    let commit1 = ethers.utils.solidityKeccak256(['int8', 'bytes32'], [choice1, secret])
    let commit2 = ethers.utils.solidityKeccak256(['int8', 'bytes32'], [choice2, secret])

    //the first player created the game
    const idGame = await rsp.connect(gameMaster).startGame(commit1, {value: sum})

    //changing the balance of the first player
    await expect(() => idGame).to.changeEtherBalance(gameMaster, -sum)
    
    //get idGame
    const _idGame = await idGame.wait();
    let id = _idGame.events[0]['args'][0];
    
    //check the created game
    let game = await rsp.games(id)
    expect(game.gameMaster).to.eq(gameMaster.address)
    expect(game.gameStopped).to.eq(false)
    expect(game.bank).to.eq(sum)

    //the second player joins the game
    const joinGame = await rsp.connect(secondPlayer).joinGame(id, commit2, {value: sum})

    //changing the balance of the second player
    await expect(() => joinGame).to.changeEtherBalance(secondPlayer, -sum)

    //get bank of game
    game = await rsp.games(id)
    expect(game.bank).to.eq(sum * 2)

    await rsp.connect(gameMaster).stopGame(id)

    game = await rsp.games(id)
    expect(game.gameStopped).to.eq(true)

    //players reveal choice
    await rsp.connect(gameMaster).revealChoice(id, choice1, secret)

    await rsp.connect(secondPlayer).revealChoice(id, choice2, secret)

    //announcement of the winner
    const gameFinal = await rsp.connect(gameMaster).gameFinal(id) 
    const _gameFinal = await gameFinal.wait();
    let winnerStr = _gameFinal.events[0]['args'][1];

    //calculate the result
    let result = i - j
    if (result == 0) {
      expect(winnerStr).to.eq("Draw")
    }
    else if (result == -1 || result == 2) {
      expect(winnerStr).to.eq("Player 1")
    }
    else if (result == 1 || result == -2) {
      expect(winnerStr).to.eq("Player 2")
    }
  }

  beforeEach(async function() {
    [gameMaster, secondPlayer, randomPlayer] = await ethers.getSigners()
    const RockScissorsPaper = await ethers.getContractFactory("RockScissorsPaper", gameMaster)
    rsp = await RockScissorsPaper.deploy()
    await rsp.deployed()
  })

  it ("should be deployed", async function() {
    expect(rsp.address).to.be.properAddress
  })

  it("all events played", async function() {
    for (let i = 1; i <= 3; ++i) {
      for (let j = 1; j <= 3; ++j) {
        await game(i, j)
      }
    }
  })

  it("change gameMaster and checking onlyGameMaster", async function() {

    let commit = ethers.utils.solidityKeccak256(['int8', 'bytes32'], [choice1, secret])
     
    const idGame = await rsp.connect(gameMaster).startGame(commit, {value: sum})    

    const result = await idGame.wait();
/*
    //displaying event arguments
    for (const event of result.events) {
      console.log(`Event ${event.event} with args ${event.args}`);
    }
*/
    let id = result.events[0]['args'][0];

    //сhecking default
    let game = await rsp.games(id)
    expect(game.gameMaster).to.eq(gameMaster.address)
    
    await rsp.connect(gameMaster).changeGameMaster(id, secondPlayer.address)

    game = await rsp.games(id)
    expect(game.gameMaster).to.eq(secondPlayer.address)

    //checking onlyGameMaster
    await expect(rsp.connect(gameMaster).changeGameMaster(id, gameMaster.address)).to.be.revertedWith(
      "You are not the creator of the game"
    )
  })

  it("correct withdraw payments", async function() {
    // Draw
    await game(1, 1)
    expect(await rsp.connect(gameMaster).getBalance(gameMaster.address)).to.eq(sum)
    
    //Player 1
    await game(1, 2) 
    //Player 2
    await game(2, 1) 
    
    let drawWin = 2 * sum

    //check balance
    expect(await rsp.connect(gameMaster).getBalance(gameMaster.address)).to.eq(drawWin)
    expect(await rsp.connect(secondPlayer).getBalance(secondPlayer.address)).to.eq(drawWin)

    const withdraw1 = await rsp.connect(gameMaster).withdrawAll()
    //changing the balance of the first player
    await expect(() => withdraw1).to.changeEtherBalance(gameMaster, drawWin)

    const withdraw2 = await rsp.connect(secondPlayer).withdrawAll()
    //changing the balance of the second player
    await expect(() => withdraw2).to.changeEtherBalance(secondPlayer, drawWin)

    //check balance
    expect(await rsp.connect(gameMaster).getBalance(gameMaster.address)).to.eq(0)
    expect(await rsp.connect(secondPlayer).getBalance(secondPlayer.address)).to.eq(0)
  })
});