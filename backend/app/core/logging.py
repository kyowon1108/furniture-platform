"""Logging configuration for the application."""

import logging
import sys
from typing import Optional

# Create logger
logger = logging.getLogger("furniture_platform")


def setup_logging(level: str = "INFO") -> None:
    """Configure logging for the application.

    Args:
        level: Logging level (DEBUG, INFO, WARNING, ERROR, CRITICAL)
    """
    log_level = getattr(logging, level.upper(), logging.INFO)

    # Create formatter
    formatter = logging.Formatter(
        "%(asctime)s - %(name)s - %(levelname)s - %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S"
    )

    # Create console handler
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(log_level)
    console_handler.setFormatter(formatter)

    # Configure root logger
    logger.setLevel(log_level)
    logger.handlers.clear()
    logger.addHandler(console_handler)

    # Prevent duplicate logs
    logger.propagate = False


def get_logger(name: Optional[str] = None) -> logging.Logger:
    """Get a logger instance.

    Args:
        name: Optional name for the logger (will be prefixed with app name)

    Returns:
        Logger instance
    """
    if name:
        return logging.getLogger(f"furniture_platform.{name}")
    return logger


# Initialize logging on module import
setup_logging()
