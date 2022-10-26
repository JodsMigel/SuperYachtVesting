const { expect } = require("chai");
const { ethers, waffle } = require("hardhat");

describe("Vesting", function () {

    let owner
    let team
    let teamPrivate
    let advisors
    let marketing
    let nftHolders
    let luquidity
    let treasury
    let staking
    let vesting
    let token

    beforeEach(async function(){
        [owner, team, teamPrivate, advisors, marketing, nftHolders, luquidity, treasury, staking, vesting ] = await ethers.getSigners()
        const TOKEN = await ethers.getContractFactory("SuperYachtCoin", owner)
        token = await TOKEN.deploy()
        await token.deployed()
        const VESTING = await ethers.getContractFactory("SuperYachtCoinVesting", owner)
        vesting = await VESTING.deploy(token.address)
        await vesting.deployed()
        await token.addVesingAddress(vesting.address);
        await create_vesting(); 
    })

    async function wait_time (amount) {
        const time = 2529100 * amount; 
        await ethers.provider.send("evm_increaseTime", [time])
        await ethers.provider.send("evm_mine")
    }

    async function batchClaim (_who,_index, _from, _to) {
      for (let i = _from; i < _to+1; i++){
        await vesting.connect(_who).claim(_index);
      }
    }

    async function create_vesting() {
      await vesting.createVesting(
        team.address, 
        teamPrivate.address, 
        advisors.address, 
        marketing.address, 
        nftHolders.address, 
        luquidity.address, 
        treasury.address, 
        staking.address
        );
    }

    function ether(amount) {
      return BigInt(ethers.utils.parseEther(amount))
    }

    const premint_NFT = ether("11000000");
    const premint_Luquidity = ether("15000000");
    const premint_treasury = ether("34200000");

    
    it("Only vesting contract can mint", async function(){
      await expect(token.mint(owner.address, 10000)).to.be.revertedWith(`Only vesting contract can call this method`);
    })

    it("Initial supply is correct", async function(){
      expect(await token.balanceOf(teamPrivate.address)).to.eq(ether("7000000"));    
      expect(await token.balanceOf(nftHolders.address)).to.eq(ether("11000000"));  
      expect(await token.balanceOf(luquidity.address)).to.eq(ether("15000000"));  
      expect(await token.balanceOf(treasury.address)).to.eq(ether("34200000")); 
    })

    it("Can not claim before end of cliff and vesting", async function(){
      await expect(vesting.connect(team).claim(0)).to.be.revertedWith(`Tokens are still locked`);
      await expect(vesting.connect(teamPrivate).claim(1)).to.be.revertedWith(`Tokens are still locked`);
      await expect(vesting.connect(advisors).claim(2)).to.be.revertedWith(`Tokens are still locked`);    
      await expect(vesting.connect(marketing).claim(3)).to.be.revertedWith(`Tokens are still locked`);
      await expect(vesting.connect(nftHolders).claim(4)).to.be.revertedWith(`Tokens are still locked`);
      await expect(vesting.connect(luquidity).claim(5)).to.be.revertedWith(`Tokens are still locked`);
      await expect(vesting.connect(treasury).claim(6)).to.be.revertedWith(`Tokens are still locked`);
      await expect(vesting.connect(staking).claim(7)).to.be.revertedWith(`Tokens are still locked`);
    })

    it("Can not claim from wrong account", async function(){
      await expect(vesting.claim(0)).to.be.revertedWith(`Not an owner of this vesting`);
      await expect(vesting.connect(teamPrivate).claim(0)).to.be.revertedWith(`Not an owner of this vesting`);
    })

    it("Correct amount of claming", async function(){
      await wait_time(2);  
      await vesting.connect(marketing).claim(3);
      await vesting.connect(nftHolders).claim(4);
      await vesting.connect(luquidity).claim(5);
      await vesting.connect(treasury).claim(6);
      await vesting.connect(staking).claim(7);
      expect(await token.balanceOf(marketing.address)).to.eq(ether("2333333"));    
      expect(await token.balanceOf(nftHolders.address)).to.eq(ether("7333333") + premint_NFT);  
      expect(await token.balanceOf(luquidity.address)).to.eq(ether("11250000") + premint_Luquidity);  
      expect(await token.balanceOf(treasury.address)).to.eq(ether("4037500") + premint_treasury); 
      expect(await token.balanceOf(staking.address)).to.eq(ether("6250000"));
    })


    it("Correct total amount of claimed tokens", async function(){
      await wait_time(50);
      await batchClaim(team, 0, 0, 11);
      await batchClaim(teamPrivate, 1, 0, 5); 
      await batchClaim(advisors, 2, 0, 11); 
      await batchClaim(marketing, 3, 0, 47); 
      await batchClaim(nftHolders, 4, 0, 5); 
      await batchClaim(luquidity, 5, 0, 11); 
      await batchClaim(treasury, 6, 0, 47);
      await batchClaim(staking, 7, 0, 47);   
      expect(await token.balanceOf(team.address)).to.eq(ether("96000000"));  
      expect(await token.balanceOf(teamPrivate.address)).to.eq(ether("35000000")); 
      expect(await token.balanceOf(advisors.address)).to.eq(ether("24000000"));
      expect(await token.balanceOf(marketing.address)).to.eq(ether("112000000"));    
      expect(await token.balanceOf(nftHolders.address)).to.eq(ether("55000000"));  
      expect(await token.balanceOf(luquidity.address)).to.eq(ether("150000000"));  
      expect(await token.balanceOf(treasury.address)).to.eq(ether("228000000")); 
      expect(await token.balanceOf(staking.address)).to.eq(ether("300000000"));
    })

    it("Can not claim more than limit", async function(){
      await wait_time(50);
      await batchClaim(team, 0, 0, 11);
      await batchClaim(teamPrivate, 1, 0, 5); 
      await batchClaim(advisors, 2, 0, 11); 
      await batchClaim(marketing, 3, 0, 47); 
      await batchClaim(nftHolders, 4, 0, 5); 
      await batchClaim(luquidity, 5, 0, 11); 
      await batchClaim(treasury, 6, 0, 47);
      await batchClaim(staking, 7, 0, 47);   
      await expect(vesting.connect(team).claim(0)).to.be.revertedWith(`Nothing to claim`);
      await expect(vesting.connect(teamPrivate).claim(1)).to.be.revertedWith(`Nothing to claim`);
      await expect(vesting.connect(advisors).claim(2)).to.be.revertedWith(`Nothing to claim`);    
      await expect(vesting.connect(marketing).claim(3)).to.be.revertedWith(`Nothing to claim`);
      await expect(vesting.connect(nftHolders).claim(4)).to.be.revertedWith(`Nothing to claim`);
      await expect(vesting.connect(luquidity).claim(5)).to.be.revertedWith(`Nothing to claim`);
      await expect(vesting.connect(treasury).claim(6)).to.be.revertedWith(`Nothing to claim`);
      await expect(vesting.connect(staking).claim(7)).to.be.revertedWith(`Nothing to claim`);
    })
});


