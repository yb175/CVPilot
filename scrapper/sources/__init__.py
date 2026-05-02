"""Job source implementations and registry."""

from typing import Dict, Type
from .base import JobSource
from .greenhouse import GreenhouseSource


class SourceRegistry:
    """Registry for job sources.
    
    Uses factory pattern to manage and instantiate job sources.
    Allows easy addition of new sources without modifying existing code.
    """
    
    _sources: Dict[str, Type[JobSource]] = {}
    
    @classmethod
    def register(cls, name: str, source_class: Type[JobSource]) -> None:
        """Register a job source.
        
        Args:
            name: Source identifier (e.g., 'greenhouse')
            source_class: JobSource subclass
        """
        cls._sources[name] = source_class
    
    @classmethod
    def get(cls, name: str) -> JobSource:
        """Get a job source instance.
        
        Args:
            name: Source identifier
        
        Returns:
            Instantiated job source
        
        Raises:
            ValueError: If source not registered
        """
        if name not in cls._sources:
            available = ", ".join(cls.list_sources())
            raise ValueError(f"Unknown source: {name}. Available: {available}")
        
        return cls._sources[name]()
    
    @classmethod
    def list_sources(cls) -> list[str]:
        """List all registered sources.
        
        Returns:
            List of source identifiers
        """
        return list(cls._sources.keys())
    
    @classmethod
    def is_registered(cls, name: str) -> bool:
        """Check if source is registered.
        
        Args:
            name: Source identifier
        
        Returns:
            True if registered, False otherwise
        """
        return name in cls._sources


# Register sources on import
SourceRegistry.register("greenhouse", GreenhouseSource)

__all__ = ["SourceRegistry", "JobSource"]
