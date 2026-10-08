"""Keep test imports and plotting independent of machine/user cache state."""
import os
import tempfile

os.environ.setdefault("F1_CACHE_DIR", tempfile.mkdtemp(prefix="f1-test-cache-"))
os.environ.setdefault("MPLCONFIGDIR", tempfile.mkdtemp(prefix="f1-test-mpl-"))
os.environ.setdefault("MPLBACKEND", "Agg")
