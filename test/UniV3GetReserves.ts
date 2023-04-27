describe('UniV3GetReserves', function() {
  it('pollReserveData', async function() {
    const UniV3GetReserves = await hre.ethers.getContractFactory('UniV3InfoPoller');
    const uniV3GetReserves = await UniV3GetReserves.deploy();
    const poolPositions = [
      {
        pool: '0x9da1d1c9353B32C9E15aDF11faDbe9F0860fCcfa', //'0xC36442b4a4522E871399CD717aBDD847Ab11FE88',
        position: '0x0000000000000000000000000000000000000000000000000000000000000000',
      }
    ];
    console.log(await uniV3GetReserves.pollReserveData(poolPositions));
  });
});
