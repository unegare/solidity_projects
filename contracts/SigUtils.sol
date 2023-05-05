// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import "hardhat/console.sol";

contract SigUtils {
    bytes32 internal DOMAIN_SEPARATOR;

    constructor(bytes32 _DOMAIN_SEPARATOR) {
        DOMAIN_SEPARATOR = _DOMAIN_SEPARATOR;
    }

    // keccak256("Permit(address owner,address spender,uint256 value,uint256 nonce,uint256 deadline)");
    bytes32 public constant PERMIT_TYPEHASH = 0x6e71edae12b1b97f4d1f60370fef10105fa2faae0126114a169c64845d6126c9;

    struct Permit {
        address owner;
        address spender;
        uint256 value;
        uint256 nonce;
        uint256 deadline;
    }

    // computes the hash of a permit
    function getStructHash(Permit memory _permit) internal view returns (bytes32) {
        bytes memory data = abi.encode(PERMIT_TYPEHASH, _permit.owner, _permit.spender, _permit.value, _permit.nonce, _permit.deadline);
        console.logBytes(data);
        bytes32 hash = keccak256(data);
        console.logBytes32(hash);
        return hash;
//        return keccak256(
//            abi.encode(PERMIT_TYPEHASH, _permit.owner, _permit.spender, _permit.value, _permit.nonce, _permit.deadline)
//        );
    }

    // computes the hash of the fully encoded EIP-712 message for the domain, which can be used to recover the signer
    function getTypedDataHash(Permit memory _permit) public view returns (bytes32) {
        bytes memory data = abi.encodePacked("\x19\x01", DOMAIN_SEPARATOR, getStructHash(_permit));
        console.logBytes(data);
        bytes32 hash = keccak256(data);
        console.logBytes32(hash);
        return hash;
    }

    function getDaiDigest(address holder, address spender, uint256 nonce, uint256 expiry, bool allowed) view public returns (bytes32 digest)
    {
        bytes32 _DOMAIN_SEPARATOR = 0xdbb8cf42e1ecb028be3f3dbc922e1d878b963f411dc388ced501601c60f7c6f7;
        bytes32 _PERMIT_TYPEHASH = 0xea2aa0a1be11a07ed86d755c93467f4f82362b452371d1ba94d1715123511acb;
        bytes memory message = abi.encodePacked(
                "\x19\x01",
                _DOMAIN_SEPARATOR,
                keccak256(abi.encode(_PERMIT_TYPEHASH,
                                     holder,
                                     spender,
                                     nonce,
                                     expiry,
                                     allowed))
        );

        console.logBytes(message);

        digest = keccak256(message);
    }

    function get_VariableDebtToken_delegationWithSig(bytes32 _DOMAIN_SEPARATOR, bytes32 DELEGATION_WITH_SIG_TYPEHASH, address delegatee, uint256 value, uint256 currentValidNonce, uint256 deadline) view external returns(bytes32) {
      bytes memory data = abi.encode(DELEGATION_WITH_SIG_TYPEHASH, delegatee, value, currentValidNonce, deadline);
      console.logBytes(data);
      bytes32 hash = keccak256(data);
      console.logBytes32(hash);
      bytes memory data2 = abi.encodePacked(
          '\x19\x01',
          _DOMAIN_SEPARATOR,
          hash
      );
      console.logBytes(data2);
      bytes32 hash2 = keccak256(data2);
      console.logBytes32(hash2);
      return hash2;
//      bytes32 digest = keccak256(
//        abi.encodePacked(
//          '\x19\x01',
//          _DOMAIN_SEPARATOR,
//          keccak256(
//            abi.encode(DELEGATION_WITH_SIG_TYPEHASH, delegatee, value, currentValidNonce, deadline)
//          )
//        )
//      );
//      return digest;
    }
}

