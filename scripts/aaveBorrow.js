const { getNamedAccounts, ethers } = require("hardhat")
const { getWeth,AMOUNT } = require("./getWeth")

async function main() {
    const {deployer} = await getNamedAccounts()
    await getWeth()
    const lendingPool = await getLandingPool(deployer)
    const wethTokenAddress = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2"
    await approveERC20(wethTokenAddress,lendingPool.address,AMOUNT,deployer)
    await lendingPool.deposit(wethTokenAddress,AMOUNT, deployer,0)

    let {availableBorrowsETH, totalDebtETH } = getBorrowUserData(lendingPool, deployer)
    const daiPrice = getDaiPrice()
    const amountDaiToBorrow = (availableBorrowsETH.toString() * 0.95)/daiPrice.toNumber()
    const amountDaiToBorrowWei = ethers.utils.parseEther(amountDaiToBorrow.toString())
    await borrowDai(
        "0x6B175474E89094C44Da98b954EedeAC495271d0F",
        lendingPool,amountDaiToBorrowWei,deployer)
    await repay(amountDaiToBorrowWei,
        "0x6B175474E89094C44Da98b954EedeAC495271d0F",
        lendingPool
        ,deployer
    )
    
}

async function repay(amount, daiAddress, lendingPool, account) {
    await approveERC20("0x6B175474E89094C44Da98b954EedeAC495271d0F",lendingPool.address, amount, account)
    const repayTx = await lendingPool.repay(
        "0x6B175474E89094C44Da98b954EedeAC495271d0F",
        amount,
        1,account
    )
    await repayTx.wait(1)
}
async function borrowDai(daiAddress, lendingPool, amountDaiToBorrowWei, account) {
    const borrowTx = await lendingPool.borrow(daiAddress,  amountDaiToBorrowWei,1,0, account)
    await borrowTx.wait(1)
}

async function getDaiPrice() {
    const daiEthPriceFeed = await ethers.getContractAt("AggregatorV3Interface", "0x773616E4d11A78F511299002da57A0a94577F1f4")
    const price = (await daiEthPriceFeed.latestRoundData())[1]
}

async function getBorrowUserData(lendingPool, account) {
    const {totalCollateralETH, totalDebtETH, availableBorrowsETH} = await lendingPool.getUserAccountData(account)
    return {availableBorrowsETH, totalDebtETH}

}

async function getLandingPool(account) {
    const lendingPoolAddressProvider = await ethers.getContractAt("ILandingPoolAddressProvider","0xB53C1a33016B2DC2fF3653530bfF1848a515c8c5",account)
    const lendingPoolAddress = await lendingPoolAddressProvider.getLandingPool()
    const lendingPool = await ethers.getContractAt("ILandingPool",lendingPoolAddress,account)
    return lendingPool;
}
async function approveERC20(erc20Address, spenderAddress, amountToSpend, account) {
    const erc20Token = await ethers.getContractAt("IERC20",erc20Address, account )
    const tx = await erc20Token.approve(spenderAddress,amountToSpend)
    await tx.wait(1)

}
main()
    .then(() => process.exit(0))
    .catch((error)=>{
        console.log(error)
        process.exit(1)
    })