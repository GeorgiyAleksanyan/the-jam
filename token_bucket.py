# Token Bucket Rate Limiter implementation

class TokenBucket:
    def __init__(self, max_tokens: int, refill_rate: float):
        self.max_tokens = max_tokens
        self.tokens = max_tokens
        self.refill_rate = refill_rate
        self.last_refill_time = 0.0

    def is_allowed(self) -> bool:
        current_time = time.time()
        self._refill(current_time)
        if self.tokens > 0:
            self.tokens -= 1
            return True
        return False

    def _refill(self, current_time: float):
        time_since_last_refill = current_time - self.last_refill_time
        tokens_to_add = time_since_last_refill * self.refill_rate
        if tokens_to_add > 0:
            self.tokens = min(self.tokens + tokens_to_add, self.max_tokens)
            self.last_refill_time = current_time
