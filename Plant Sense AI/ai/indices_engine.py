from __future__ import annotations

import numpy as np
from typing import Dict, Any, Optional


def calculate_indices(
    *,
    red: np.ndarray,
    green: np.ndarray,
    blue: np.ndarray,
    nir: Optional[np.ndarray] = None,
    swir: Optional[np.ndarray] = None,
) -> Dict[str, np.ndarray]:
    """
    Advanced Spectral Indices Engine.
    Calculates various vegetation and moisture indices using NumPy.
    
    If NIR is not provided, it is estimated using a heuristic based on image brightness 
    and greenness channels (for prototype simulation purposes).
    """
    
    # 1. NIR Simulation (if missing) 
    # In a real multispectral camera, this band is captured separately.
    if nir is None:
        # Heuristic: NIR is usually higher in areas with high Green and low Red.
        nir = 0.5 * green + 0.3 * (1.0 - red) + 0.2
        nir = np.clip(nir, 0.0, 1.0)

    # Small epsilon to avoid division by zero
    eps = 1e-6

    # 2. NDVI (Normalized Difference Vegetation Index)
    # Range: [-1, 1], Healthy: 0.6 - 0.9
    ndvi = (nir - red) / (nir + red + eps)

    # 3. EVI (Enhanced Vegetation Index)
    # Range: [0, 1], Better at high biomass
    # Formula: G * (NIR - Red) / (NIR + C1 * Red - C2 * Blue + L)
    g = 2.5
    c1 = 6.0
    c2 = 7.5
    l = 1.0
    evi = g * (nir - red) / (nir + c1 * red - c2 * blue + l + eps)

    # 4. GNDVI (Green NDVI)
    # More sensitive to chlorophyll
    gndvi = (nir - green) / (nir + green + eps)

    # 5. MSAVI (Modified Soil Adjusted Vegetation Index)
    # Filters soil background interference
    msavi = (2 * nir + 1 - np.sqrt((2 * nir + 1)**2 - 8 * (nir - red))) / 2.0

    # 6. NDWI (Normalized Difference Water Index - Canopy)
    # High NDWI = High water content
    # Note: If SWIR is missing, we use a Green-NIR version for moisture proxy.
    if swir is not None:
        ndwi = (nir - swir) / (nir + swir + eps)
    else:
        # Proxy using Green/NIR contrast
        ndwi = (green - nir) / (green + nir + eps)

    return {
        "ndvi": np.clip(ndvi, -1.0, 1.0),
        "evi": np.clip(evi, -1.0, 1.0),
        "gndvi": np.clip(gndvi, -1.0, 1.0),
        "msavi": np.clip(msavi, -1.0, 1.0),
        "ndwi": np.clip(ndwi, -1.0, 1.0),
    }


def get_stats_from_map(idx_map: np.ndarray) -> Dict[str, float]:
    """Helper to get min/max/mean from a floating-point map."""
    return {
        "mean": float(np.mean(idx_map)),
        "min": float(np.min(idx_map)),
        "max": float(np.max(idx_map)),
    }
