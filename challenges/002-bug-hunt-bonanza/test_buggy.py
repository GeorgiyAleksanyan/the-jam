#!/usr/bin/env python3
"""
Bug Hunt Bonanza - Test Suite
Some tests pass, some fail due to bugs in buggy_code.py
"""

import pytest
from buggy_code import (
    calculate_average,
    find_max,
    reverse_string,
    count_words,
    is_palindrome,
    fibonacci,
    find_duplicates,
    merge_sorted_lists,
    calculate_discount,
    validate_email,
)


class TestCalculateAverage:
    def test_average_normal(self):
        assert calculate_average([1, 2, 3, 4, 5]) == 3.0
    
    def test_average_empty(self):
        """This test FAILS - division by zero"""
        assert calculate_average([]) == 0


class TestFindMax:
    def test_max_positive(self):
        assert find_max([1, 5, 3, 9, 2]) == 9
    
    def test_max_negative(self):
        """This test FAILS - returns 0 instead of -1"""
        assert find_max([-5, -3, -1, -4]) == -1


class TestReverseString:
    def test_reverse_normal(self):
        """This test FAILS - misses first character"""
        assert reverse_string("hello") == "olleh"
    
    def test_reverse_empty(self):
        assert reverse_string("") == ""


class TestCountWords:
    def test_count_normal(self):
        assert count_words("hello world") == 2
    
    def test_count_multiple_spaces(self):
        """This test FAILS - counts empty strings as words"""
        assert count_words("hello   world") == 2


class TestIsPalindrome:
    def test_palindrome_simple(self):
        assert is_palindrome("racecar") == True
    
    def test_palindrome_case_insensitive(self):
        """This test FAILS - case sensitivity not handled"""
        assert is_palindrome("RaceCar") == True


class TestFibonacci:
    def test_fib_zero(self):
        assert fibonacci(0) == 0
    
    def test_fib_one(self):
        """This test FAILS - returns 0 instead of 1"""
        assert fibonacci(1) == 1
    
    def test_fib_five(self):
        assert fibonacci(5) == 5


class TestFindDuplicates:
    def test_duplicates_middle(self):
        assert set(find_duplicates([1, 2, 2, 3])) == {2}
    
    def test_duplicates_at_end(self):
        """This test FAILS - doesn't check last element"""
        assert set(find_duplicates([1, 2, 3, 3])) == {3}


class TestMergeSortedLists:
    def test_merge_normal(self):
        """This test FAILS - loses elements from list1"""
        assert merge_sorted_lists([1, 3, 5], [2, 4, 6]) == [1, 2, 3, 4, 5, 6]
    
    def test_merge_empty(self):
        assert merge_sorted_lists([], [1, 2, 3]) == [1, 2, 3]


class TestCalculateDiscount:
    def test_discount_normal(self):
        """This test FAILS - wrong formula"""
        assert calculate_discount(100, 20) == 80.0


class TestValidateEmail:
    def test_email_valid(self):
        assert validate_email("test@example.com") == True
    
    def test_email_invalid_dot_before_at(self):
        """This test FAILS - doesn't check dot position"""
        assert validate_email("test.name@example") == False
