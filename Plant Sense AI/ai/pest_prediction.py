from __future__ import annotations

import math
from typing import Any, Dict, List, Optional


def calculate_pest_risk(
    *,
    temperature_mean: float,
    humidity_mean: float,
    precip_prob: float = 0.0,
    leaf_wetness: Optional[float] = None,
) -> Dict[str, Any]:
    """
    Biological Risk Model for Pests and Fungal Diseases.
    
    Logic:
    1. GDD (Growing Degree Days): Pests develop faster in warm weather.
    2. Fungal Risk: High humidity + moderate temp = High risk.
    3. Alert Generation: Specific biological warnings.
    """
    
    # 1. GDD Estimation (Simple Base-10 model)
    # Most pests have a base threshold of 10°C.
    base_temp = 10.0
    gdd = max(0.0, temperature_mean - base_temp)
    
    # GDD Risk Score (Scaled 0 to 1)
    # Higher GDD in a short window usually means rapid pest population growth.
    pest_metabolism_risk = min(1.0, gdd / 20.0) 

    # 2. Fungal / Disease Risk Thresholds
    # Fungi like Oidium or Botrytis thrive in high humidity (>75%) 
    # and moderate temperatures (18-28°C).
    fungal_risk = 0.0
    if humidity_mean > 70:
        # Humidity factor: Exponential risk as humidity approaches 100%
        h_factor = (humidity_mean - 70) / 30.0
        
        # Temp factor: Bell curve centered at 24°C
        t_factor = max(0.0, 1.0 - abs(temperature_mean - 24.0) / 10.0)
        
        fungal_risk = h_factor * t_factor

    # 3. Leaf Wetness Estimation (if not provided)
    # Estimated by combination of humidity and precipitation
    est_leaf_wetness = leaf_wetness
    if est_leaf_wetness is None:
        est_leaf_wetness = (humidity_mean / 100.0) * (1.0 + precip_prob)
        est_leaf_wetness = min(1.0, float(est_leaf_wetness))

    # Master Score (Weighted)
    # 60% Fungal (Environmental), 40% Pest (Metabolic/GDD)
    master_score = (0.6 * fungal_risk) + (0.4 * pest_metabolism_risk)
    
    # Generate Alerts
    alerts = []
    if fungal_risk > 0.7:
        alerts.append({
            "level": "red",
            "message": f"CRITICAL: High fungal infection risk detected ({int(fungal_risk*100)}%). Action required."
        })
    elif fungal_risk > 0.4:
        alerts.append({
            "level": "yellow",
            "message": "WARNING: Conditions favorable for fungal growth. Monitor closely."
        })

    if pest_metabolism_risk > 0.8:
        alerts.append({
            "level": "yellow",
            "message": "PEST ALERT: Rapid development window detected due to high GDD."
        })

    return {
        "pest_risk_score": round(master_score, 3),
        "fungal_risk": round(fungal_risk, 3),
        "gdd": round(gdd, 2),
        "estimated_leaf_wetness": round(est_leaf_wetness, 3),
        "alerts": alerts
    }
