from pathlib import Path

from helper_methods import read_yaml_file

ARTIFACTS_PATH = Path(__file__).resolve().parents[1] / "parameters" / "artifacts.yaml"


def load_parameters() -> dict:
    """Loads artifacts.yaml (nested dict) with ${VAR} secrets resolved from .env."""
    return read_yaml_file(ARTIFACTS_PATH)
