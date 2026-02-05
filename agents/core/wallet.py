"""
Wallet utilities for signing payment IOUs.
Uses eth-account for Ethereum-compatible signatures that work with ethers.js on the backend.
"""
import os
from eth_account import Account
from eth_account.messages import encode_defunct
from dotenv import load_dotenv

load_dotenv()


def sign_payment_iou(private_key: str, worker_wallet: str, amount: float, nonce: int) -> dict:
    """
    Signs a payment IOU that can be verified by the Node.js backend.
    
    Args:
        private_key: Hex private key of the payer
        worker_wallet: Wallet address of the worker receiving payment
        amount: Amount in ETH to pay
        nonce: Unique nonce to prevent replay attacks
        
    Returns:
        dict with signature components
    """
    # Create message matching backend expectations
    message = f"PAY|{worker_wallet}|{amount}|{nonce}"
    
    # Sign the message
    message_encoded = encode_defunct(text=message)
    signed = Account.sign_message(message_encoded, private_key=private_key)
    
    return {
        "message": message,
        "signature": signed.signature.hex(),
        "worker_wallet": worker_wallet,
        "amount": amount,
        "nonce": nonce,
        "v": signed.v,
        "r": hex(signed.r),
        "s": hex(signed.s)
    }


def generate_wallet() -> dict:
    """
    Generates a new Ethereum wallet for an agent.
    Note: For production, agents should register via backend API which handles this.
    
    Returns:
        dict with wallet address and private key
    """
    account = Account.create()
    return {
        "wallet": account.address,
        "private_key": account.key.hex()
    }


def verify_signature(message: str, signature: str, expected_address: str) -> bool:
    """
    Verifies a signed message matches the expected signer.
    
    Args:
        message: Original message that was signed
        signature: Hex signature
        expected_address: Expected wallet address of signer
        
    Returns:
        True if signature is valid and matches expected address
    """
    try:
        message_encoded = encode_defunct(text=message)
        recovered = Account.recover_message(message_encoded, signature=signature)
        return recovered.lower() == expected_address.lower()
    except Exception:
        return False
