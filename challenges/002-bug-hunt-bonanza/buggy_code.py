#!/usr/bin/env python3
"""
Bug Hunt Bonanza - Buggy Code Module
Contains several functions with subtle bugs for agents to find and fix.
"""

def calculate_average(numbers: list) -> float:
    """Calculate the average of a list of numbers."""
    total = 0
    for n in numbers:
        total += n
    # BUG: Division by zero when list is empty
    return total / len(numbers)


def find_max(numbers: list) -> int:
    """Find the maximum value in a list."""
    # BUG: Assumes positive numbers, fails for all-negative lists
    max_val = 0
    for n in numbers:
        if n > max_val:
            max_val = n
    return max_val


def reverse_string(s: str) -> str:
    """Reverse a string."""
    result = ""
    # BUG: Off-by-one error, misses the first character
    for i in range(len(s) - 1, 0, -1):
        result += s[i]
    return result


def count_words(text: str) -> int:
    """Count the number of words in a text."""
    if not text:
        return 0
    # BUG: Doesn't handle multiple spaces between words
    words = text.split(" ")
    return len(words)


def is_palindrome(s: str) -> bool:
    """Check if a string is a palindrome (case-insensitive)."""
    # BUG: Doesn't handle case sensitivity
    cleaned = ''.join(c for c in s if c.isalnum())
    return cleaned == cleaned[::-1]


def fibonacci(n: int) -> int:
    """Return the nth Fibonacci number (0-indexed)."""
    if n <= 0:
        return 0
    # BUG: Wrong base case, should return 1 for n=1
    if n == 1:
        return 0
    return fibonacci(n - 1) + fibonacci(n - 2)


def find_duplicates(arr: list) -> list:
    """Find all duplicate values in a list."""
    seen = set()
    duplicates = set()
    # BUG: Off-by-one, doesn't check last element
    for i in range(len(arr) - 1):
        if arr[i] in seen:
            duplicates.add(arr[i])
        seen.add(arr[i])
    return list(duplicates)


def merge_sorted_lists(list1: list, list2: list) -> list:
    """Merge two sorted lists into one sorted list."""
    result = []
    i, j = 0, 0
    
    while i < len(list1) and j < len(list2):
        if list1[i] < list2[j]:
            result.append(list1[i])
            i += 1
        else:
            result.append(list2[j])
            j += 1
    
    # BUG: Missing remainder of list1 when list2 is exhausted
    while j < len(list2):
        result.append(list2[j])
        j += 1
    
    return result


def calculate_discount(price: float, discount_percent: float) -> float:
    """Calculate the discounted price."""
    # BUG: Incorrect operator precedence / wrong formula
    return price - discount_percent / 100


def validate_email(email: str) -> bool:
    """Basic email validation - checks for @ and . after @."""
    if not email:
        return False
    # BUG: Doesn't check that . comes after @
    return '@' in email and '.' in email
