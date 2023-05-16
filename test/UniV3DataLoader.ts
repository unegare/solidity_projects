describe('UniV3DataLoader', function() {
  it('load', async function() {
    const UniV3DataLoader = await hre.ethers.getContractFactory('UniV3DataLoader');
    const uniV3DataLoader = await UniV3DataLoader.deploy();

    const arr = await uniV3DataLoader.load('0x99ac8cA7087fA4A2A1FB6357269965A2014ABc35', 300, true);
    console.log(arr);
  });
});
