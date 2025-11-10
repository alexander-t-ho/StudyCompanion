import React from "react"
import { ArrowRightIcon } from "@radix-ui/react-icons"
import { cn } from "../../lib/utils"
import { Button } from "./Button"
import './BentoGrid.css'

export const BentoGrid = ({
  children,
  className,
}) => {
  return (
    <div className={cn("bento-grid", className)}>
      {children}
    </div>
  )
}

export const BentoCard = ({
  name,
  className,
  background,
  Icon,
  description,
  href,
  cta,
  onClick,
}) => {
  const handleClick = (e) => {
    if (onClick) {
      e.preventDefault()
      onClick(name, href)
    }
  }

  return (
    <div
      key={name}
      className={cn("bento-card", className)}
      onClick={handleClick}
    >
      <div className="bento-card-background">{background}</div>
      <div className="bento-card-content">
        {Icon && <Icon className="bento-card-icon" />}
        <h3 className="bento-card-title">{name}</h3>
        <p className="bento-card-description">{description}</p>
      </div>

      <div className="bento-card-cta">
        <Button variant="ghost" asChild size="sm">
          <a href={href || "#"} onClick={handleClick}>
            {cta}
            <ArrowRightIcon className="bento-card-arrow" />
          </a>
        </Button>
      </div>
      <div className="bento-card-overlay" />
    </div>
  )
}

