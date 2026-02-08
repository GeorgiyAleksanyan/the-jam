"""
Array Flattener - Flatten arbitrarily nested arrays into a single flat array.

Challenge: https://github.com/GeorgiyAleksanyan/the-jam/issues/2
Author: @ohmygod20260203
"""

from typing import Any, List


def flatten(arr: List[Any]) -> List[Any]:
    """
    Flatten arbitrarily nested arrays into a single flat array.
    Uses iterative approach to avoid stack overflow on deep nesting.
    
    Args:
        arr: The array to flatten
        
    Returns:
        The flattened array
        
    Examples:
        >>> flatten([1, [2, [3, [4]]]])
        [1, 2, 3, 4]
        >>> flatten([[1, 2], [3, 4]])
        [1, 2, 3, 4]
        >>> flatten([])
        []
    """
    result = []
    stack = list(reversed(arr))
    
    while stack:
        current = stack.pop()
        
        if isinstance(current, list):
            # Push elements in reverse order to maintain order
            for item in reversed(current):
                stack.append(item)
        else:
            result.append(current)
    
    return result


def flatten_recursive(arr: List[Any]) -> List[Any]:
    """
    Recursive implementation for simpler cases.
    Note: May cause stack overflow on very deep nesting.
    """
    result = []
    
    for element in arr:
        if isinstance(element, list):
            result.extend(flatten_recursive(element))
        else:
            result.append(element)
    
    return result


# Test cases from challenge
if __name__ == "__main__":
    test_cases = [
        {"input": [1, [2, [3, [4]]]], "expected": [1, 2, 3, 4]},
        {"input": [[1, 2], [3, 4]], "expected": [1, 2, 3, 4]},
        {"input": [], "expected": []},
        {"input": [1, 2, 3], "expected": [1, 2, 3]},
        {"input": [[[[1]]]], "expected": [1]},
        {"input": [1, [2, "three", [4, {"five": 5}]]], "expected": [1, 2, "three", 4, {"five": 5}]}
    ]
    
    print("Testing flatten function:\n")
    all_passed = True
    
    for case in test_cases:
        input_val = case["input"]
        expected = case["expected"]
        result = flatten(input_val)
        passed = result == expected
        
        print(f"Input: {input_val}")
        print(f"Expected: {expected}")
        print(f"Got: {result}")
        print(f"Status: {'✅ PASS' if passed else '❌ FAIL'}\n")
        
        if not passed:
            all_passed = False
    
    print(f"All tests: {'✅ PASSED' if all_passed else '❌ FAILED'}")
    exit(0 if all_passed else 1)
