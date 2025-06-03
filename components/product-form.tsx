"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { Product } from "@/types/product"
import { uploadMultipleImagesToBlob } from "@/lib/blob-storage"

interface ProductFormProps {
  product?: Product | null
  onSubmit: (product: Product | Omit<Product, "id">) => void
  onCancel: () => void
}

export default function ProductForm({ product, onSubmit, onCancel }: ProductFormProps) {
  const [formData, setFormData] = useState({
    name: product?.name || "",
    description: product?.description || "",
    price: product?.price || "",
    images: product?.images || [],
    paymentLink: product?.paymentLink || "",
    category: product?.category || "Starter Package",
  })

  // Store temporary base64 images during form editing
  const [tempImages, setTempImages] = useState<string[]>(
    // If we have existing images that are URLs (not base64), keep them as is
    // Otherwise, start with an empty array
    product?.images?.length && !product.images[0].startsWith("data:") ? [] : product?.images || [],
  )

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isUploadingImages, setIsUploadingImages] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.name.trim()) newErrors.name = "Product name is required"
    if (!formData.description.trim()) newErrors.description = "Description is required"
    if (!formData.price.trim()) newErrors.price = "Price is required"
    if (!formData.paymentLink.trim()) newErrors.paymentLink = "Payment link is required"

    // Check if we have either existing images or new temp images
    const hasImages = formData.images.length > 0 || tempImages.length > 0
    if (!hasImages) newErrors.images = "At least one image is required"

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    setIsSubmitting(true)

    try {
      // If we have temporary base64 images, upload them to Blob storage
      let finalImages = [...formData.images]

      if (tempImages.length > 0) {
        // Show uploading state
        setIsSubmitting(true)

        // Upload all temp images to Blob storage
        const uploadedImageUrls = await uploadMultipleImagesToBlob(tempImages)

        // Add the new image URLs to our existing images
        finalImages = [...finalImages, ...uploadedImageUrls]
      }

      // Submit the form with the final image URLs
      const finalFormData = {
        ...formData,
        images: finalImages,
      }

      await onSubmit(product ? { ...product, ...finalFormData } : finalFormData)
    } catch (error) {
      console.error("Error submitting product:", error)
      alert("Error uploading images. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])

    if (files.length === 0) return

    // Limit number of images
    const totalImages = tempImages.length + formData.images.length
    if (totalImages + files.length > 5) {
      alert("Maximum 5 images allowed per product.")
      return
    }

    setIsUploadingImages(true)

    try {
      const resizedImages = await Promise.all(
        files.map(async (file) => {
          return new Promise<string>((resolve, reject) => {
            const canvas = document.createElement("canvas")
            const ctx = canvas.getContext("2d")
            const img = new Image()

            img.onload = () => {
              // Set maximum dimensions
              const maxWidth = 1920
              const maxHeight = 1920

              let { width, height } = img

              // Calculate new dimensions while maintaining aspect ratio
              if (width > maxWidth || height > maxHeight) {
                const ratio = Math.min(maxWidth / width, maxHeight / height)
                width = width * ratio
                height = height * ratio
              }

              canvas.width = width
              canvas.height = height

              // Draw the resized image
              ctx?.drawImage(img, 0, 0, width, height)

              // Convert to data URL with high quality
              const resizedDataUrl = canvas.toDataURL("image/jpeg", 0.95)
              resolve(resizedDataUrl)
            }

            img.onerror = reject
            img.src = URL.createObjectURL(file)
          })
        }),
      )

      // Store the base64 images temporarily
      setTempImages((prev) => [...prev, ...resizedImages])
    } catch (error) {
      console.error("Error processing images:", error)
      alert("Error uploading images. Please try again.")
    } finally {
      setIsUploadingImages(false)
    }
  }

  const removeImage = (indexToRemove: number, isTemp: boolean) => {
    if (isTemp) {
      setTempImages((prev) => prev.filter((_, i) => i !== indexToRemove))
    } else {
      setFormData((prev) => ({
        ...prev,
        images: prev.images.filter((_, i) => i !== indexToRemove),
      }))
    }
  }

  // Combine existing image URLs and temporary base64 images for display
  const allImages = [...formData.images, ...tempImages]

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="name">Product Name</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
            placeholder="e.g., Luna - Fashion Influencer"
            required
          />
          {errors.name && <p className="text-red-500 text-sm">{errors.name}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="price">Price</Label>
          <Input
            id="price"
            value={formData.price}
            onChange={(e) => setFormData((prev) => ({ ...prev, price: e.target.value }))}
            placeholder="e.g., $299"
            required
          />
          {errors.price && <p className="text-red-500 text-sm">{errors.price}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="category">Category</Label>
          <Select
            value={formData.category}
            onValueChange={(value) => {
              if (value === "Starter Package") {
                setFormData((prev) => ({
                  ...prev,
                  category: value,
                  price: "$497",
                  description: `Starter Package ($497)

(For Beginners Ready To Launch Their First AI Model whilst skipping the AI Creation Phase)

What You Get:

• A Custom Built Pre-made AI Model LoRa - (So that you can plug and play and start generating images of your model immediately)
• A Basic ComfyUI Workflow - (So that you can skip the platform setup and plug in your LoRa Immediately)  
• A Basic ComfyUI Workflow Video Guide - (So you know how to use the Lora to create content)

This Package Is Perfect For:

• People who are just starting out in their AI Model journey and would like to skip the trial and error phase of designing and creating their first model
• People who have completed The AI Model Method $47 course and would like to take their AI Model business to the next level immediately
• Those who are struggling to generate consistent ultra realistic content
• Those who want to fast track the process and have an extremely high quality AI Model within the next couple minutes`,
                }))
              } else if (value === "Pro Package") {
                setFormData((prev) => ({
                  ...prev,
                  category: value,
                  price: "$997",
                  description: `Pro Package ($997)

(For Serious AI Model Creators Ready To Monetise)

What You Get:

EVERYTHING IN 'STARTER PACKAGE', PLUS:

• 15 Pre-made Instagram Posts - (So that you can start marketing immediately)
• 15 Fanvue Free Wall Posts - (So that you have a Fanvue worth subscribing to today)
• 1 Fanvue Profile Picture - (Designed for conversions)
• 1 Fanvue Banner Image - (A 5 image collage designed for conversion)
• 1 Image ready to turn into a Fanvue Intro Video - (To help boost your discoverability and conversions)

Bonuses:

• Intermediate ComfyUI Workflow + Upscaler - (So that you can develop content on the most advanced AI platform with ease)
• Video Tutorial Guide
• SFW Prompt Guide

This Package Is Perfect For:

• Creators who understand the basics and are ready to establish a profitable AI Model presence
• Those who want a head start getting their AI Model business up and running from DAY 1
• Creators looking to implement a world class level AI Model into their business`,
                }))
              } else {
                setFormData((prev) => ({ ...prev, category: value }))
              }
            }}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Starter Package">Starter Package</SelectItem>
              <SelectItem value="Pro Package">Pro Package</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="paymentLink">Payment Link</Label>
          <Input
            id="paymentLink"
            type="url"
            value={formData.paymentLink}
            onChange={(e) => setFormData((prev) => ({ ...prev, paymentLink: e.target.value }))}
            placeholder="https://your-payment-provider.com/product-link"
            required
          />
          {errors.paymentLink && <p className="text-red-500 text-sm">{errors.paymentLink}</p>}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
          placeholder="Describe your AI influencer model, its capabilities, and ideal use cases..."
          rows={16}
          required
        />
        {errors.description && <p className="text-red-500 text-sm">{errors.description}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="images">
          Product Images ({allImages.length}/5)
          {isUploadingImages && <span className="text-blue-600"> - Resizing images...</span>}
        </Label>
        <Input
          id="images"
          type="file"
          accept="image/*"
          multiple
          onChange={handleImageUpload}
          disabled={isUploadingImages || allImages.length >= 5}
          className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100"
        />
        {errors.images && <p className="text-red-500 text-sm">{errors.images}</p>}
        <p className="text-sm text-gray-500">
          Maximum 5 images. Images will be automatically resized to 1920x1920px maximum while maintaining quality and
          aspect ratio.
        </p>

        {allImages.length > 0 && (
          <div className="grid grid-cols-4 gap-4 mt-4">
            {formData.images.map((image, index) => (
              <div key={`existing-${index}`} className="relative">
                <img
                  src={image || "/placeholder.svg"}
                  alt={`Preview ${index + 1}`}
                  className="w-full h-24 object-cover rounded-lg"
                />
                <Button
                  type="button"
                  size="sm"
                  variant="destructive"
                  className="absolute -top-2 -right-2 h-6 w-6 p-0 rounded-full"
                  onClick={() => removeImage(index, false)}
                >
                  ×
                </Button>
                {index === 0 && formData.images.length > 0 && (
                  <div className="absolute bottom-1 left-1 bg-blue-600 text-white text-xs px-1 rounded">Main</div>
                )}
              </div>
            ))}

            {tempImages.map((image, index) => (
              <div key={`temp-${index}`} className="relative">
                <img
                  src={image || "/placeholder.svg"}
                  alt={`New Preview ${index + 1}`}
                  className="w-full h-24 object-cover rounded-lg"
                />
                <Button
                  type="button"
                  size="sm"
                  variant="destructive"
                  className="absolute -top-2 -right-2 h-6 w-6 p-0 rounded-full"
                  onClick={() => removeImage(index, true)}
                >
                  ×
                </Button>
                {index === 0 && formData.images.length === 0 && (
                  <div className="absolute bottom-1 left-1 bg-blue-600 text-white text-xs px-1 rounded">Main</div>
                )}
                <div className="absolute bottom-1 right-1 bg-amber-500 text-white text-xs px-1 rounded">New</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex gap-4">
        <Button
          type="submit"
          className="flex-1 hover:scale-105 transition-transform duration-200 active:scale-95"
          disabled={isSubmitting || isUploadingImages}
        >
          {isSubmitting ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
              {product ? "Updating..." : "Adding..."}
            </>
          ) : product ? (
            "Update Product"
          ) : (
            "Add Product"
          )}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          className="flex-1 hover:bg-gray-50 transition-all duration-200 active:scale-95"
          disabled={isSubmitting || isUploadingImages}
        >
          Cancel
        </Button>
      </div>
    </form>
  )
}
