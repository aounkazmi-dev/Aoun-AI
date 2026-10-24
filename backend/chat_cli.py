"""Terminal adapter. Run from the repository root: python -m backend.chat_cli."""

import argparse
import logging

from backend import demo, rag


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--debug", action="store_true")
    parser.add_argument("--demo", action="store_true", help="Offline lexical lookup; no AI generation")
    args = parser.parse_args()
    print("AounOS — " + ("offline document preview" if args.demo else "personal AI portfolio assistant"))
    print("Type exit to quit.\n")
    history = []
    while True:
        try:
            question = input("you > ").strip()
            if question.lower() in {"exit", "quit"}:
                break
            if not question:
                continue
            if args.demo:
                answer, chunks = demo.answer(question, history)
                pieces, info = iter([answer]), {"provider": "offline"}
            else:
                messages, chunks = rag.prepare(question, history)
                info = {}
                pieces = rag.stream_reply(messages, info)
            if args.debug:
                for chunk in chunks:
                    print(f"  [{chunk['id']}] {chunk['source']} / {chunk['section']}")
            print("aounos > ", end="", flush=True)
            reply = ""
            for piece in pieces:
                print(piece, end="", flush=True)
                reply += piece
            print("\n")
            history = (
                history + [{"role": "user", "content": question}, {"role": "assistant", "content": reply}]
            )[-6:]
        except (EOFError, KeyboardInterrupt):
            print("\nGoodbye.")
            break
        except ValueError as exc:
            print(f"\n{exc}\n")
        except Exception as exc:
            logging.getLogger("aoun.cli").warning("request_failed error_type=%s", type(exc).__name__)
            print(
                "\nThe answer could not be completed. Check server configuration and index readiness, then retry.\n"
            )


if __name__ == "__main__":
    main()
