pragma solidity ^0.5.0;

contract PoseidonUnit {
  function poseidon(uint256[] memory) public pure returns(uint256) {}
}

contract Poseidon {
  PoseidonUnit poseidonUnit;

  constructor( address _poseidonContractAddr) public {
    poseidonUnit = PoseidonUnit(_poseidonContractAddr);
  }

  function GetScalarField () internal pure returns (uint256){
    return 0x30644e72e131a029b85045b68181585d2833e84879b9709143e1f593f0000001;
  }

  function PoseidonHash( uint256[] memory in_x ) public view returns (uint256) {
    return poseidonUnit.poseidon(in_x);
  }
}
