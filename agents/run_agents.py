#!/usr/bin/env python3
"""
Agent Runner - CLI for managing and testing AI agents.
Usage:
    python run_agents.py register   - Register all agents with backend
    python run_agents.py demo       - Run a demo workflow
    python run_agents.py workflow "your task here"  - Run custom workflow
"""
import sys
import os

# Add agents directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from orchestrator import UniversalOrchestrator
from dotenv import load_dotenv

load_dotenv()


def register_agents():
    """Register all specialist agents with the backend."""
    print("=" * 60)
    print("AGENT REGISTRATION")
    print("=" * 60)
    
    orchestrator = UniversalOrchestrator()
    orchestrator.register_all_agents()
    
    print("\nAgents registered! Check your frontend at http://localhost:5173")
    print("Navigate to the 'Agents' tab to see them listed.")


def run_demo():
    """Run a demo summarization workflow."""
    print("=" * 60)
    print("DEMO WORKFLOW")
    print("=" * 60)
    
    orchestrator = UniversalOrchestrator()
    
    test_text = """Technology has transformed modern education by making learning more accessible 
    and flexible. Online classes, digital libraries, and educational apps allow students to study 
    from anywhere and learn at their own pace. Personalized learning systems use data and AI to 
    support students based on their performance, helping teachers focus more on guidance. However, 
    technology also brings challenges such as increased screen time, unequal access to devices, 
    and overdependence on automated tools. When used responsibly, technology remains a powerful 
    aid in improving the quality and reach of education."""
    
    result = orchestrator.run(f"Summarize the following text: '{test_text}'")
    
    print("\n" + "=" * 60)
    print("RESULT")
    print("=" * 60)
    print(f"\nFinal Output:\n{result['final_output']}")
    print(f"\nTotal Cost: {result['total_cost']} ETH")
    print(f"Steps: {len(result['steps'])}")


def run_workflow(task: str):
    """Run a custom workflow task."""
    print("=" * 60)
    print("CUSTOM WORKFLOW")
    print("=" * 60)
    print(f"Task: {task}\n")
    
    orchestrator = UniversalOrchestrator()
    result = orchestrator.run(task)
    
    print("\n" + "=" * 60)
    print("RESULT")
    print("=" * 60)
    print(f"\nFinal Output:\n{result['final_output']}")
    print(f"\nTotal Cost: {result['total_cost']} ETH")
    
    print("\nSteps taken:")
    for step in result['steps']:
        print(f"  {step['step']}. {step['agent']}: {step['instruction']} (Cost: {step['cost']} ETH)")


def print_help():
    print(__doc__)


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print_help()
        sys.exit(0)
    
    command = sys.argv[1].lower()
    
    if command == "register":
        register_agents()
    elif command == "demo":
        run_demo()
    elif command == "workflow":
        if len(sys.argv) < 3:
            print("Error: Please provide a task for the workflow")
            print('Example: python run_agents.py workflow "Summarize this text"')
            sys.exit(1)
        task = " ".join(sys.argv[2:])
        run_workflow(task)
    elif command in ["help", "-h", "--help"]:
        print_help()
    else:
        print(f"Unknown command: {command}")
        print_help()
        sys.exit(1)
