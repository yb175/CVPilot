"""Configuration loader for companies."""

import json
from pathlib import Path
from typing import Dict, List
from utils.exceptions import ConfigException
from utils.logger import get_logger


logger = get_logger(__name__)


def load_companies(config_path: Path = None) -> Dict[str, List[str]]:
    """Load company configuration from JSON file.
    
    Args:
        config_path: Path to companies.json (defaults to same directory as this module)
    
    Returns:
        Dictionary mapping source names to company lists
        Example: {"greenhouse": ["stripe", "notion", ...]}
    
    Raises:
        ConfigException: If file not found or invalid JSON
    """
    if config_path is None:
        config_path = Path(__file__).parent.parent / "companies.json"
    
    config_path = Path(config_path)
    
    if not config_path.exists():
        raise ConfigException(f"Configuration file not found: {config_path}")
    
    try:
        with open(config_path, "r") as f:
            companies = json.load(f)
        
        # Validate structure
        if not isinstance(companies, dict):
            raise ConfigException("Configuration must be a JSON object")
        
        for source, company_list in companies.items():
            if not isinstance(company_list, list):
                raise ConfigException(f"Source '{source}' must map to a list of companies")
            
            for company in company_list:
                if not isinstance(company, str):
                    raise ConfigException(f"Company names must be strings, got {type(company)}")
        
        logger.info(
            "Loaded company configuration",
            extra={
                "sources": len(companies),
                "total_companies": sum(len(v) for v in companies.values())
            }
        )
        
        return companies
    
    except json.JSONDecodeError as e:
        raise ConfigException(f"Invalid JSON in configuration file: {e}")
    except Exception as e:
        raise ConfigException(f"Failed to load configuration: {e}")


def load_config():
    """Load environment-based configuration.
    
    Returns:
        Dictionary with configuration values
    """
    from os import getenv
    
    return {
        "http_timeout": int(getenv("HTTP_TIMEOUT", "10")),
        "max_retries": int(getenv("MAX_RETRIES", "3")),
        "retry_backoff_factor": float(getenv("RETRY_BACKOFF_FACTOR", "1.5")),
        "requests_per_second": int(getenv("REQUESTS_PER_SECOND", "5")),
        "debug": getenv("DEBUG", "false").lower() == "true",
    }
