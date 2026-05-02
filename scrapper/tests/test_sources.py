"""Tests for job source registry."""

import pytest
from sources import SourceRegistry
from sources.greenhouse import GreenhouseSource
from utils.exceptions import ScraperException


def test_source_registry_register():
    """Test registering a source."""
    # Greenhouse should already be registered
    assert SourceRegistry.is_registered("greenhouse")


def test_source_registry_get():
    """Test getting a registered source."""
    source = SourceRegistry.get("greenhouse")
    assert isinstance(source, GreenhouseSource)


def test_source_registry_list_sources():
    """Test listing available sources."""
    sources = SourceRegistry.list_sources()
    assert isinstance(sources, list)
    assert len(sources) > 0
    assert "greenhouse" in sources


def test_source_registry_get_unregistered():
    """Test getting unregistered source."""
    with pytest.raises(ValueError) as exc_info:
        SourceRegistry.get("nonexistent_source")
    
    assert "Unknown source" in str(exc_info.value)


def test_source_registry_is_registered():
    """Test checking if source is registered."""
    assert SourceRegistry.is_registered("greenhouse")
    assert not SourceRegistry.is_registered("nonexistent")
